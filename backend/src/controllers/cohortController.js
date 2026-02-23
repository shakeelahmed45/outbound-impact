const prisma = require('../lib/prisma');
const { buildOrgFilter, getAutoAssignOrgId } = require("../helpers/orgScope");
const QRCode = require('qrcode');
const axios = require('axios');
const { nanoid } = require('nanoid');
const { sendCohortMemberEmail } = require('../services/emailService');

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const generateUniqueSlug = async () => {
  let slug;
  let exists = true;
  while (exists) {
    slug = nanoid(8);
    const existing = await prisma.cohort.findUnique({ where: { slug } });
    exists = !!existing;
  }
  return slug;
};

const generateCohortQRCode = async (slug) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://outboundimpact.net';
    const cohortUrl = `${baseUrl}/g/${slug}`;
    const qrUrl = `${cohortUrl}?s=qr`;

    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
      width: 500,
      margin: 2,
      color: { dark: '#800080', light: '#FFFFFF' },
    });

    const bunnyHostname = process.env.BUNNY_HOSTNAME || 'storage.bunnycdn.com';
    const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE;
    const bunnyStoragePassword = process.env.BUNNY_STORAGE_PASSWORD;
    const bunnyPullZone = process.env.BUNNY_PULL_ZONE;

    const timestamp = Date.now();
    const fileName = `cohort-qr-${slug}-${timestamp}.png`;

    await axios.put(
      `https://${bunnyHostname}/${bunnyStorageZone}/qr-codes/${fileName}`,
      qrCodeBuffer,
      { headers: { 'AccessKey': bunnyStoragePassword, 'Content-Type': 'image/png' } }
    );

    return `https://${bunnyPullZone}/qr-codes/${fileName}`;
  } catch (error) {
    console.error('Cohort QR generation error:', error.message);
    // Fallback to data URL
    try {
      const baseUrl = process.env.FRONTEND_URL || 'https://outboundimpact.net';
      const qrUrl = `${baseUrl}/g/${slug}?s=qr`;
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 500, margin: 2,
        color: { dark: '#800080', light: '#FFFFFF' },
      });
      return dataUrl;
    } catch (e) {
      return null;
    }
  }
};

// ═══════════════════════════════════════════════
// NOTIFICATION HELPER
// Send email to newly added members
// ═══════════════════════════════════════════════

const getOrganizationName = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name || 'Outbound Impact';
  } catch {
    return 'Outbound Impact';
  }
};

const notifyCohortMember = async ({ email, name, cohortName, organizationName, cohortSlug }) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://outboundimpact.net';
  const cohortLink = `${baseUrl}/g/${cohortSlug}`;

  // Send email notification (fire-and-forget, don't block the response)
  if (email) {
    sendCohortMemberEmail({
      memberEmail: email,
      memberName: name,
      cohortName,
      organizationName,
      cohortLink,
    }).catch(err => console.error('📧 Cohort email failed:', err.message));
  }
};

// ═══════════════════════════════════════════════
// COHORT CRUD
// ═══════════════════════════════════════════════

// GET /api/cohorts — List all cohorts for user
const getCohorts = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const cohorts = await prisma.cohort.findMany({
      where: { userId, ...buildOrgFilter(req) },
      include: {
        _count: {
          select: {
            members: true,
            streams: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = cohorts.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      slug: c.slug,
      qrCodeUrl: c.qrCodeUrl,
      status: c.status,
      memberCount: c._count.members,
      streamCount: c._count.streams,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({ status: 'success', cohorts: result });
  } catch (error) {
    console.error('Get cohorts error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch cohorts' });
  }
};

// POST /api/cohorts — Create cohort
const createCohort = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { name, description } = req.body;

    // VIEWER team members cannot create cohorts
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role does not have permission to create cohorts' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Cohort name is required' });
    }

    const slug = await generateUniqueSlug();
    const qrCodeUrl = await generateCohortQRCode(slug);

    const cohort = await prisma.cohort.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        qrCodeUrl,
        organizationId: req.body.organizationId || getAutoAssignOrgId(req),
      },
    });

    console.log(`✅ Cohort created: "${cohort.name}" (slug: ${slug})`);

    res.status(201).json({
      status: 'success',
      message: 'Cohort created successfully',
      cohort: {
        ...cohort,
        memberCount: 0,
        streamCount: 0,
      },
    });
  } catch (error) {
    console.error('Create cohort error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create cohort' });
  }
};

// PUT /api/cohorts/:id — Update cohort
const updateCohort = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    // VIEWER team members cannot edit cohorts
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role does not have permission to edit cohorts' });
    }
    const { name, description, status } = req.body;

    const cohort = await prisma.cohort.findFirst({ where: { id, userId } });
    if (!cohort) {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    const updated = await prisma.cohort.update({
      where: { id },
      data: {
        name: name?.trim() || cohort.name,
        description: description !== undefined ? (description?.trim() || null) : cohort.description,
        status: status || cohort.status,
      },
    });

    res.json({ status: 'success', message: 'Cohort updated', cohort: updated });
  } catch (error) {
    console.error('Update cohort error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update cohort' });
  }
};

// DELETE /api/cohorts/:id — Delete cohort
const deleteCohort = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    // VIEWER team members cannot delete cohorts
    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({ status: 'error', message: 'Only ADMIN role can delete cohorts' });
    }

    const cohort = await prisma.cohort.findFirst({ where: { id, userId } });
    if (!cohort) {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    await prisma.cohort.delete({ where: { id } });
    console.log(`🗑️ Cohort deleted: "${cohort.name}"`);

    res.json({ status: 'success', message: 'Cohort deleted successfully' });
  } catch (error) {
    console.error('Delete cohort error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete cohort' });
  }
};

// ═══════════════════════════════════════════════
// COHORT MEMBERS
// ═══════════════════════════════════════════════

// GET /api/cohorts/:id/members — Get members
const getMembers = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    const cohort = await prisma.cohort.findFirst({ where: { id, userId } });
    if (!cohort) {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    const members = await prisma.cohortMember.findMany({
      where: { cohortId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ status: 'success', members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch members' });
  }
};

// POST /api/cohorts/:id/members — Add member(s)
const addMembers = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { members } = req.body; // Array: [{ name, email }]

    // VIEWER team members cannot add members
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role does not have permission to add cohort members' });
    }

    const cohort = await prisma.cohort.findFirst({ where: { id, userId } });
    if (!cohort) {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ status: 'error', message: 'At least one member is required' });
    }

    // Get org name once for all notifications
    const organizationName = await getOrganizationName(userId);

    let added = 0;
    let skipped = 0;
    const addedMembers = []; // Track who was actually added for notifications

    for (const member of members) {
      const email = member.email?.toLowerCase().trim() || null;
      const name = member.name?.trim() || null;

      if (!email && !name) {
        skipped++;
        continue;
      }

      try {
        await prisma.cohortMember.create({
          data: {
            cohortId: id,
            name,
            email,
          },
        });
        added++;
        addedMembers.push({ email, name });
      } catch (e) {
        // Duplicate email in this cohort - skip
        if (e.code === 'P2002') {
          skipped++;
        } else {
          throw e;
        }
      }
    }

    console.log(`✅ Members added to "${cohort.name}": ${added} added, ${skipped} skipped`);

    // Update last activity
    await prisma.cohort.update({ where: { id }, data: { updatedAt: new Date() } });

    // 📧 Send email notifications to newly added members (fire-and-forget)
    for (const m of addedMembers) {
      notifyCohortMember({
        email: m.email,
        name: m.name,
        cohortName: cohort.name,
        organizationName,
        cohortSlug: cohort.slug,
      });
    }

    res.json({
      status: 'success',
      message: `${added} member(s) added${skipped > 0 ? `, ${skipped} skipped (duplicates)` : ''}`,
      added,
      skipped,
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to add members' });
  }
};

// DELETE /api/cohorts/:id/members/:memberId — Remove member
const removeMember = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id, memberId } = req.params;

    // VIEWER team members cannot remove members
    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({ status: 'error', message: 'Only ADMIN role can remove cohort members' });
    }

    const cohort = await prisma.cohort.findFirst({ where: { id, userId } });
    if (!cohort) {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    const member = await prisma.cohortMember.findFirst({ where: { id: memberId, cohortId: id } });
    if (!member) {
      return res.status(404).json({ status: 'error', message: 'Member not found' });
    }

    await prisma.cohortMember.delete({ where: { id: memberId } });

    // Update last activity
    await prisma.cohort.update({ where: { id }, data: { updatedAt: new Date() } });

    res.json({ status: 'success', message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove member' });
  }
};

// POST /api/cohorts/:id/members/import — Import CSV
const importMembers = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { csvData } = req.body; // String of CSV content

    // VIEWER team members cannot import members
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role does not have permission to import cohort members' });
    }

    const cohort = await prisma.cohort.findFirst({ where: { id, userId } });
    if (!cohort) {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ status: 'error', message: 'CSV data is required' });
    }

    const lines = csvData.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ status: 'error', message: 'CSV must have a header row and at least one data row' });
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = header.findIndex(h => h === 'name');
    const emailIdx = header.findIndex(h => h === 'email');

    if (emailIdx === -1 && nameIdx === -1) {
      return res.status(400).json({ status: 'error', message: 'CSV must have at least a "name" or "email" column' });
    }

    // Get org name once for all notifications
    const organizationName = await getOrganizationName(userId);

    let added = 0;
    let skipped = 0;
    const addedMembers = []; // Track who was actually added for notifications

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const name = nameIdx >= 0 ? (cols[nameIdx] || null) : null;
      const email = emailIdx >= 0 ? (cols[emailIdx]?.toLowerCase() || null) : null;

      if (!email && !name) {
        skipped++;
        continue;
      }

      try {
        await prisma.cohortMember.create({
          data: { cohortId: id, name, email },
        });
        added++;
        addedMembers.push({ email, name });
      } catch (e) {
        if (e.code === 'P2002') skipped++;
        else throw e;
      }
    }

    console.log(`✅ CSV import to "${cohort.name}": ${added} added, ${skipped} skipped`);

    // Update last activity
    await prisma.cohort.update({ where: { id }, data: { updatedAt: new Date() } });

    // 📧 Send email notifications to newly imported members (fire-and-forget)
    for (const m of addedMembers) {
      notifyCohortMember({
        email: m.email,
        name: m.name,
        cohortName: cohort.name,
        organizationName,
        cohortSlug: cohort.slug,
      });
    }

    res.json({
      status: 'success',
      message: `Imported ${added} member(s)${skipped > 0 ? `, ${skipped} skipped` : ''}`,
      added,
      skipped,
    });
  } catch (error) {
    console.error('Import members error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to import members' });
  }
};

// ═══════════════════════════════════════════════
// COHORT STREAMS (assign/remove campaigns)
// ═══════════════════════════════════════════════

// GET /api/cohorts/:id/streams — Get assigned streams
const getStreams = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    const cohort = await prisma.cohort.findFirst({ where: { id, userId } });
    if (!cohort) {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    const cohortStreams = await prisma.cohortStream.findMany({
      where: { cohortId: id },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logoUrl: true,
            views: true,
            _count: { select: { items: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const streams = cohortStreams.map(cs => ({
      assignmentId: cs.id,
      ...cs.campaign,
      itemCount: cs.campaign._count.items,
    }));

    res.json({ status: 'success', streams });
  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch streams' });
  }
};

// POST /api/cohorts/:id/streams — Assign stream(s)
const assignStreams = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { campaignIds } = req.body; // Array of campaign IDs

    // VIEWER team members cannot assign streams
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role does not have permission to assign streams' });
    }

    const cohort = await prisma.cohort.findFirst({ where: { id, userId } });
    if (!cohort) {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({ status: 'error', message: 'At least one stream ID is required' });
    }

    // Remove existing assignments first, then re-assign selected ones
    await prisma.cohortStream.deleteMany({ where: { cohortId: id } });

    const created = [];
    for (const campaignId of campaignIds) {
      // Verify campaign belongs to user
      const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
      if (campaign) {
        const cs = await prisma.cohortStream.create({
          data: { cohortId: id, campaignId },
        });
        created.push(cs);
      }
    }

    console.log(`✅ Streams assigned to "${cohort.name}": ${created.length} streams`);

    // Update last activity
    await prisma.cohort.update({ where: { id }, data: { updatedAt: new Date() } });

    res.json({
      status: 'success',
      message: `${created.length} stream(s) assigned`,
      count: created.length,
    });
  } catch (error) {
    console.error('Assign streams error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to assign streams' });
  }
};

// DELETE /api/cohorts/:id/streams/:assignmentId — Remove stream
const removeStream = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id, assignmentId } = req.params;

    // VIEWER team members cannot remove streams
    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role does not have permission to remove streams' });
    }

    const cohort = await prisma.cohort.findFirst({ where: { id, userId } });
    if (!cohort) {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    await prisma.cohortStream.delete({ where: { id: assignmentId } });

    res.json({ status: 'success', message: 'Stream removed from cohort' });
  } catch (error) {
    console.error('Remove stream error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove stream' });
  }
};

// ═══════════════════════════════════════════════
// PUBLIC COHORT VIEWER (when QR is scanned)
// ═══════════════════════════════════════════════

// GET /api/cohorts/public/:slug — Public cohort page
const getPublicCohort = async (req, res) => {
  try {
    const { slug } = req.params;

    const cohort = await prisma.cohort.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        status: true,
        userId: true,
        streams: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                logoUrl: true,
                views: true,
                _count: { select: { items: true } },
              },
            },
          },
        },
      },
    });

    if (!cohort || cohort.status !== 'active') {
      return res.status(404).json({ status: 'error', message: 'Cohort not found' });
    }

    // Update last activity timestamp (fires on every view/scan)
    prisma.cohort.update({
      where: { id: cohort.id },
      data: { updatedAt: new Date() },
    }).catch(e => console.error('Failed to update cohort activity:', e.message));

    // Get organization name
    let orgName = 'Unknown';
    try {
      const user = await prisma.user.findUnique({
        where: { id: cohort.userId },
        select: { name: true },
      });
      if (user) orgName = user.name;
    } catch (e) {}

    const streams = cohort.streams.map(cs => ({
      id: cs.campaign.id,
      name: cs.campaign.name,
      slug: cs.campaign.slug,
      description: cs.campaign.description,
      logoUrl: cs.campaign.logoUrl,
      views: cs.campaign.views,
      itemCount: cs.campaign._count.items,
    }));

    res.json({
      status: 'success',
      cohort: {
        name: cohort.name,
        description: cohort.description,
        slug: cohort.slug,
        organization: orgName,
        streams,
      },
    });
  } catch (error) {
    console.error('Get public cohort error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch cohort' });
  }
};

module.exports = {
  getCohorts,
  createCohort,
  updateCohort,
  deleteCohort,
  getMembers,
  addMembers,
  removeMember,
  importMembers,
  getStreams,
  assignStreams,
  removeStream,
  getPublicCohort,
};