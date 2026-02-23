const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════
// GET /api/organizations — List all with Pablo metrics
// ═══════════════════════════════════════════════
const getOrganizations = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const organizations = await prisma.organization.findMany({
      where: { userId },
      include: {
        items: {
          select: { id: true, views: true, qrCodeUrl: true },
        },
        campaigns: {
          select: { id: true, views: true, viewsQr: true, qrCodeUrl: true },
        },
        cohorts: {
          select: { id: true },
        },
        members: {
          include: {
            teamMember: {
              select: { id: true, email: true, role: true, status: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Build Pablo-matching stats per org
    const orgsWithStats = organizations.map(org => {
      const streams = org.campaigns.length;
      const uploads = org.items.length;
      const cohorts = org.cohorts.length;
      const activeUsers = org.members.filter(m => m.teamMember.status === 'ACCEPTED').length;

      // Count QR codes: streams with qrCodeUrl + items with qrCodeUrl
      const streamQrCodes = org.campaigns.filter(c => c.qrCodeUrl).length;
      const itemQrCodes = org.items.filter(i => i.qrCodeUrl).length;
      const qrCodes = streamQrCodes + itemQrCodes;

      // Compliance = % of streams that have QR codes generated
      // If no streams, 100% (nothing to be non-compliant about)
      const compliance = streams === 0
        ? '100%'
        : Math.round((streamQrCodes / streams) * 100) + '%';

      // Total QR scans across all streams in this org
      const totalQrScans = org.campaigns.reduce((sum, c) => sum + c.viewsQr, 0);

      // Total views
      const totalViews = org.items.reduce((sum, i) => sum + i.views, 0)
        + org.campaigns.reduce((sum, c) => sum + c.views, 0);

      return {
        id: org.id,
        name: org.name,
        description: org.description,
        color: org.color,
        icon: org.icon,
        status: org.status,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        // Pablo-matching fields
        regions: cohorts,          // cohorts = regions equivalent
        campaigns: streams,        // streams count
        assets: uploads,           // uploads count
        qrCodes: qrCodes,         // total QR codes generated
        activeUsers: activeUsers,  // team members assigned
        compliance: compliance,    // % streams with QR codes
        // Extra metrics
        totalViews,
        totalQrScans,
        members: org.members.map(m => ({
          id: m.id,
          teamMemberId: m.teamMember.id,
          email: m.teamMember.email,
          role: m.teamMember.role,
          status: m.teamMember.status,
        })),
      };
    });

    res.json({
      status: 'success',
      organizations: orgsWithStats,
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch organizations' });
  }
};

// ═══════════════════════════════════════════════
// GET /api/organizations/:id — Get one with full details
// ═══════════════════════════════════════════════
const getOrganizationDetail = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    const org = await prisma.organization.findFirst({
      where: { id, userId },
      include: {
        items: {
          select: {
            id: true, title: true, type: true, slug: true, views: true,
            thumbnailUrl: true, mediaUrl: true, qrCodeUrl: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        campaigns: {
          select: {
            id: true, name: true, slug: true, views: true, viewsQr: true,
            qrCodeUrl: true, category: true, createdAt: true,
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        cohorts: {
          select: {
            id: true, name: true, slug: true, status: true,
            _count: { select: { members: true, streams: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        members: {
          include: {
            teamMember: {
              select: { id: true, email: true, role: true, status: true },
            },
          },
        },
      },
    });

    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }

    res.json({ status: 'success', organization: org });
  } catch (error) {
    console.error('Get organization detail error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch organization details' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/organizations — Create
// ═══════════════════════════════════════════════
const createOrganization = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { name, description } = req.body;

    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({ status: 'error', message: 'Only ADMIN role can create organizations' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Organization name is required' });
    }

    const org = await prisma.organization.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    console.log(`✅ Organization created: "${org.name}"`);
    res.status(201).json({ status: 'success', message: 'Organization created', organization: org });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create organization' });
  }
};

// ═══════════════════════════════════════════════
// PUT /api/organizations/:id — Update
// ═══════════════════════════════════════════════
const updateOrganization = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { name, description } = req.body;

    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({ status: 'error', message: 'Only ADMIN role can edit organizations' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        name: name?.trim() || org.name,
        description: description !== undefined ? (description?.trim() || null) : org.description,
      },
    });

    res.json({ status: 'success', message: 'Organization updated', organization: updated });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update organization' });
  }
};

// ═══════════════════════════════════════════════
// DELETE /api/organizations/:id — Delete (unassigns content)
// ═══════════════════════════════════════════════
const deleteOrganization = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;

    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({ status: 'error', message: 'Only ADMIN role can delete organizations' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }

    await prisma.$transaction([
      prisma.item.updateMany({ where: { organizationId: id }, data: { organizationId: null } }),
      prisma.campaign.updateMany({ where: { organizationId: id }, data: { organizationId: null } }),
      prisma.cohort.updateMany({ where: { organizationId: id }, data: { organizationId: null } }),
      prisma.organization.delete({ where: { id } }),
    ]);

    console.log(`🗑️ Organization deleted: "${org.name}"`);
    res.json({ status: 'success', message: 'Organization deleted. All content has been unassigned.' });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete organization' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/organizations/:id/assign-items
// ═══════════════════════════════════════════════
const assignItems = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { itemIds } = req.body;

    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role cannot assign items' });
    }
    if (!itemIds?.length) {
      return res.status(400).json({ status: 'error', message: 'Item IDs are required' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' });

    const result = await prisma.item.updateMany({
      where: { id: { in: itemIds }, userId },
      data: { organizationId: id },
    });

    res.json({ status: 'success', message: `${result.count} item(s) assigned`, count: result.count });
  } catch (error) {
    console.error('Assign items error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to assign items' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/organizations/:id/remove-items
// ═══════════════════════════════════════════════
const removeItems = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { itemIds } = req.body;

    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({ status: 'error', message: 'Only ADMIN role can remove items from organizations' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' });

    const result = await prisma.item.updateMany({
      where: { id: { in: itemIds }, userId, organizationId: id },
      data: { organizationId: null },
    });

    res.json({ status: 'success', message: `${result.count} item(s) removed`, count: result.count });
  } catch (error) {
    console.error('Remove items error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove items' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/organizations/:id/assign-streams
// ═══════════════════════════════════════════════
const assignStreams = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { campaignIds } = req.body;

    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role cannot assign streams' });
    }
    if (!campaignIds?.length) {
      return res.status(400).json({ status: 'error', message: 'Stream IDs are required' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' });

    const result = await prisma.campaign.updateMany({
      where: { id: { in: campaignIds }, userId },
      data: { organizationId: id },
    });

    res.json({ status: 'success', message: `${result.count} stream(s) assigned`, count: result.count });
  } catch (error) {
    console.error('Assign streams error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to assign streams' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/organizations/:id/remove-streams
// ═══════════════════════════════════════════════
const removeStreams = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { campaignIds } = req.body;

    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({ status: 'error', message: 'Only ADMIN role can remove streams from organizations' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' });

    const result = await prisma.campaign.updateMany({
      where: { id: { in: campaignIds }, userId, organizationId: id },
      data: { organizationId: null },
    });

    res.json({ status: 'success', message: `${result.count} stream(s) removed`, count: result.count });
  } catch (error) {
    console.error('Remove streams error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove streams' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/organizations/:id/assign-cohorts
// ═══════════════════════════════════════════════
const assignCohorts = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { cohortIds } = req.body;

    if (req.teamRole === 'VIEWER') {
      return res.status(403).json({ status: 'error', message: 'VIEWER role cannot assign cohorts' });
    }
    if (!cohortIds?.length) {
      return res.status(400).json({ status: 'error', message: 'Cohort IDs are required' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' });

    const result = await prisma.cohort.updateMany({
      where: { id: { in: cohortIds }, userId },
      data: { organizationId: id },
    });

    res.json({ status: 'success', message: `${result.count} cohort(s) assigned`, count: result.count });
  } catch (error) {
    console.error('Assign cohorts error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to assign cohorts' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/organizations/:id/remove-cohorts
// ═══════════════════════════════════════════════
const removeCohorts = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { cohortIds } = req.body;

    if (req.teamRole === 'VIEWER' || req.teamRole === 'EDITOR') {
      return res.status(403).json({ status: 'error', message: 'Only ADMIN role can remove cohorts from organizations' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' });

    const result = await prisma.cohort.updateMany({
      where: { id: { in: cohortIds }, userId, organizationId: id },
      data: { organizationId: null },
    });

    res.json({ status: 'success', message: `${result.count} cohort(s) removed`, count: result.count });
  } catch (error) {
    console.error('Remove cohorts error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove cohorts' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/organizations/:id/assign-members
// ═══════════════════════════════════════════════
const assignMembers = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { teamMemberIds } = req.body;

    if (req.isTeamMember && req.teamRole !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Only owners and admins can assign members' });
    }
    if (!teamMemberIds?.length) {
      return res.status(400).json({ status: 'error', message: 'Team member IDs are required' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' });

    const validMembers = await prisma.teamMember.findMany({
      where: { id: { in: teamMemberIds }, userId, status: 'ACCEPTED' },
    });

    let assigned = 0;
    for (const member of validMembers) {
      try {
        await prisma.organizationMember.create({
          data: { organizationId: id, teamMemberId: member.id },
        });
        assigned++;
      } catch (e) {
        if (e.code !== 'P2002') throw e;
      }
    }

    res.json({ status: 'success', message: `${assigned} member(s) assigned`, count: assigned });
  } catch (error) {
    console.error('Assign members error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to assign members' });
  }
};

// ═══════════════════════════════════════════════
// POST /api/organizations/:id/remove-members
// ═══════════════════════════════════════════════
const removeMembers = async (req, res) => {
  try {
    const userId = req.effectiveUserId;
    const { id } = req.params;
    const { teamMemberIds } = req.body;

    if (req.isTeamMember && req.teamRole !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Only owners and admins can remove members' });
    }

    const org = await prisma.organization.findFirst({ where: { id, userId } });
    if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' });

    const result = await prisma.organizationMember.deleteMany({
      where: { organizationId: id, teamMemberId: { in: teamMemberIds } },
    });

    res.json({ status: 'success', message: `${result.count} member(s) removed`, count: result.count });
  } catch (error) {
    console.error('Remove members error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove members' });
  }
};

// ═══════════════════════════════════════════════
// GET /api/organizations/unassigned — Unassigned content
// ═══════════════════════════════════════════════
const getUnassigned = async (req, res) => {
  try {
    const userId = req.effectiveUserId;

    const [items, campaigns, cohorts] = await Promise.all([
      prisma.item.findMany({
        where: { userId, organizationId: null },
        select: { id: true, title: true, type: true, slug: true, views: true, qrCodeUrl: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.findMany({
        where: { userId, organizationId: null },
        select: {
          id: true, name: true, slug: true, views: true, viewsQr: true, qrCodeUrl: true, category: true, createdAt: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cohort.findMany({
        where: { userId, organizationId: null },
        select: { id: true, name: true, slug: true, status: true, _count: { select: { members: true, streams: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ status: 'success', items, campaigns, cohorts });
  } catch (error) {
    console.error('Get unassigned error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch unassigned content' });
  }
};

module.exports = {
  getOrganizations,
  getOrganizationDetail,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  assignItems,
  removeItems,
  assignStreams,
  removeStreams,
  assignCohorts,
  removeCohorts,
  assignMembers,
  removeMembers,
  getUnassigned,
};