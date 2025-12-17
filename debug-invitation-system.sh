#!/bin/bash

echo "================================================"
echo "🔍 COMPLETE INVITATION SYSTEM DIAGNOSTIC"
echo "================================================"
echo ""

# ============================================
# PART 1: BACKEND CHECKS
# ============================================
echo "🔧 BACKEND CHECKS"
echo "================================================"
echo ""

echo "1️⃣ Checking teamController.js..."
if [ -f "backend/src/controllers/teamController.js" ]; then
    echo "✅ teamController.js exists"
    echo ""
    echo "Checking acceptInvitation function:"
    grep -n "const acceptInvitation" backend/src/controllers/teamController.js || echo "❌ acceptInvitation function NOT FOUND"
    echo ""
    echo "Checking memberUserId handling:"
    grep -n "memberUserId" backend/src/controllers/teamController.js | head -5
else
    echo "❌ teamController.js NOT FOUND"
fi
echo ""

echo "2️⃣ Checking authController.js..."
if [ -f "backend/src/controllers/authController.js" ]; then
    echo "✅ authController.js exists"
    echo ""
    echo "Checking team member detection in signIn:"
    grep -n "teamMember" backend/src/controllers/authController.js | grep -i "signin\|findFirst" | head -5
    echo ""
    echo "Checking getCurrentUser team handling:"
    grep -n "isTeamMember" backend/src/controllers/authController.js | head -5
else
    echo "❌ authController.js NOT FOUND"
fi
echo ""

echo "3️⃣ Checking middleware..."
if [ -f "backend/src/middleware/resolveEffectiveUserId.js" ]; then
    echo "✅ resolveEffectiveUserId.js exists"
    grep -n "req.effectiveUserId\|req.teamRole" backend/src/middleware/resolveEffectiveUserId.js | head -3
else
    echo "❌ resolveEffectiveUserId.js NOT FOUND"
fi
echo ""

echo "4️⃣ Checking team routes..."
if [ -f "backend/src/routes/teamRoutes.js" ]; then
    echo "✅ teamRoutes.js exists"
    echo ""
    echo "Public invitation routes:"
    grep -n "/invitation" backend/src/routes/teamRoutes.js
else
    echo "❌ teamRoutes.js NOT FOUND"
fi
echo ""

echo "5️⃣ Checking Prisma schema..."
if [ -f "backend/prisma/schema.prisma" ]; then
    echo "✅ schema.prisma exists"
    echo ""
    echo "TeamMember model:"
    grep -A15 "model TeamMember" backend/prisma/schema.prisma
else
    echo "❌ schema.prisma NOT FOUND"
fi
echo ""

# ============================================
# PART 2: FRONTEND CHECKS
# ============================================
echo ""
echo "🎨 FRONTEND CHECKS"
echo "================================================"
echo ""

echo "1️⃣ Checking AcceptInvitation.jsx..."
if [ -f "frontend/src/pages/AcceptInvitation.jsx" ]; then
    echo "✅ AcceptInvitation.jsx exists"
    echo ""
    echo "Checking API calls:"
    grep -n "api.get\|api.post" frontend/src/pages/AcceptInvitation.jsx | grep "invitation"
    echo ""
    echo "Checking state variables:"
    grep -n "useState" frontend/src/pages/AcceptInvitation.jsx | head -10
    echo ""
    echo "Checking userExists handling:"
    grep -n "userExists" frontend/src/pages/AcceptInvitation.jsx | head -5
else
    echo "❌ AcceptInvitation.jsx NOT FOUND"
fi
echo ""

echo "2️⃣ Checking Dashboard.jsx..."
if [ -f "frontend/src/pages/Dashboard.jsx" ]; then
    echo "✅ Dashboard.jsx exists"
    echo ""
    echo "Checking team member handling:"
    grep -n "isTeamMember\|teamRole" frontend/src/pages/Dashboard.jsx | head -5
else
    echo "❌ Dashboard.jsx NOT FOUND"
fi
echo ""

echo "3️⃣ Checking API configuration..."
if [ -f "frontend/src/services/api.js" ]; then
    echo "✅ api.js exists"
    echo ""
    grep -n "baseURL\|VITE_API_URL" frontend/src/services/api.js
else
    echo "❌ api.js NOT FOUND"
fi
echo ""

echo "4️⃣ Checking .env files..."
if [ -f "frontend/.env" ]; then
    echo "✅ frontend/.env exists"
    echo "API URL:"
    grep "VITE_API_URL" frontend/.env || echo "❌ VITE_API_URL not set"
else
    echo "❌ frontend/.env NOT FOUND"
fi
if [ -f "backend/.env" ]; then
    echo "✅ backend/.env exists"
    echo "DATABASE_URL present:"
    grep -c "DATABASE_URL" backend/.env
else
    echo "❌ backend/.env NOT FOUND"
fi
echo ""

# ============================================
# PART 3: RUNTIME CHECKS
# ============================================
echo ""
echo "🚀 RUNTIME CHECKS"
echo "================================================"
echo ""

echo "1️⃣ Backend server status..."
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend responding"
else
    echo "⚠️  Backend not responding (or no /health endpoint)"
fi
echo ""

echo "2️⃣ Frontend server status..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend responding"
else
    echo "❌ Frontend NOT responding"
fi
echo ""

echo "3️⃣ Testing invitation endpoint..."
if curl -s http://localhost:5000/api/team/invitation/test-token 2>&1 | grep -q "status"; then
    echo "✅ Invitation endpoint responding"
    curl -s http://localhost:5000/api/team/invitation/test-token | head -5
else
    echo "❌ Invitation endpoint NOT working"
fi
echo ""

# ============================================
# PART 4: DATABASE CHECKS
# ============================================
echo ""
echo "💾 DATABASE CHECKS"
echo "================================================"
echo ""

echo "Checking if Prisma is installed..."
if [ -f "backend/package.json" ]; then
    grep -c "prisma" backend/package.json > /dev/null && echo "✅ Prisma in package.json" || echo "❌ Prisma NOT in package.json"
fi
echo ""

echo "Checking migrations..."
if [ -d "backend/prisma/migrations" ]; then
    echo "✅ Migrations folder exists"
    echo "Recent migrations:"
    ls -lt backend/prisma/migrations | head -5
else
    echo "❌ No migrations folder"
fi
echo ""

# ============================================
# PART 5: PROCESS CHECKS
# ============================================
echo ""
echo "⚙️  PROCESS CHECKS"
echo "================================================"
echo ""

echo "Node processes:"
ps aux | grep node | grep -v grep | head -5
echo ""

echo "Port 5173 (frontend):"
lsof -ti:5173 2>/dev/null && echo "✅ In use" || echo "❌ Not in use"

echo "Port 5000 (backend):"
lsof -ti:5000 2>/dev/null && echo "✅ In use" || echo "❌ Not in use"
echo ""

# ============================================
# SUMMARY
# ============================================
echo ""
echo "================================================"
echo "✅ DIAGNOSTIC COMPLETE"
echo "================================================"
echo ""
echo "📤 COPY ALL OUTPUT ABOVE AND SHARE"
echo ""
