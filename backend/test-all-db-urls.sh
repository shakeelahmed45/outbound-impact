#!/bin/bash

echo "========================================"
echo "DATABASE URL TESTER - ALL SSL MODES"
echo "========================================"
echo ""

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# Get base URL (remove any existing SSL parameters)
BASE_URL=$(echo $DATABASE_URL | sed 's/?.*$//')
echo "Base URL (password hidden): $(echo $BASE_URL | sed 's/:[^:@]*@/:***@/')"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counter
WORKING_COUNT=0
WORKING_URL=""

# Function to test URL with Prisma
test_prisma_url() {
    local TEST_URL=$1
    local NAME=$2
    
    echo -e "${BLUE}Testing: $NAME${NC}"
    echo "URL: $(echo $TEST_URL | sed 's/:[^:@]*@/:***@/')"
    
    # Create temporary .env
    echo "DATABASE_URL=\"$TEST_URL\"" > .env.test
    
    # Test with Prisma
    if DATABASE_URL="$TEST_URL" npx prisma db execute --stdin <<< "SELECT 1;" 2>&1 | grep -q "Error\|failed\|Can't reach"; then
        echo -e "${RED}✗ FAILED${NC}"
        echo ""
        return 1
    else
        echo -e "${GREEN}✓ ✓ ✓ SUCCESS! ✓ ✓ ✓${NC}"
        echo -e "${GREEN}This URL works!${NC}"
        echo ""
        WORKING_COUNT=$((WORKING_COUNT + 1))
        WORKING_URL=$TEST_URL
        return 0
    fi
}

# Test with psql if available
test_psql_url() {
    local TEST_URL=$1
    local NAME=$2
    
    echo -e "${BLUE}Testing with psql: $NAME${NC}"
    
    if psql "$TEST_URL" -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓ psql connection successful${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ psql connection failed${NC}"
        echo "Error: $(psql "$TEST_URL" -c "SELECT 1;" 2>&1 | head -2)"
        echo ""
        return 1
    fi
}

echo "========================================"
echo "TESTING DIFFERENT SSL CONFIGURATIONS"
echo "========================================"
echo ""

# Test 1: No SSL parameter (original)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: No SSL parameter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_prisma_url "$BASE_URL" "No SSL"
TEST1=$?

# Test 2: sslmode=require
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: SSL Required"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_prisma_url "${BASE_URL}?sslmode=require" "SSL Required"
TEST2=$?

# Test 3: sslmode=no-verify
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: SSL No Verify"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_prisma_url "${BASE_URL}?sslmode=no-verify" "SSL No Verify"
TEST3=$?

# Test 4: sslmode=prefer
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: SSL Prefer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_prisma_url "${BASE_URL}?sslmode=prefer" "SSL Prefer"
TEST4=$?

# Test 5: sslmode=disable
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: SSL Disabled"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_prisma_url "${BASE_URL}?sslmode=disable" "SSL Disabled"
TEST5=$?

# Test with psql if installed
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "BONUS: Testing with PostgreSQL client"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v psql &> /dev/null; then
    echo "psql is installed. Testing connections..."
    echo ""
    test_psql_url "${BASE_URL}?sslmode=require" "SSL Required (psql)"
else
    echo -e "${YELLOW}psql not installed (skipping)${NC}"
    echo "Install with: brew install postgresql"
    echo ""
fi

# Clean up
rm -f .env.test

# Summary
echo "========================================"
echo "SUMMARY"
echo "========================================"
echo ""

if [ $WORKING_COUNT -eq 0 ]; then
    echo -e "${RED}❌ NO WORKING URL FOUND!${NC}"
    echo ""
    echo "This means one of these issues:"
    echo "1. Wrong password/credentials"
    echo "2. Railway database is down"
    echo "3. Database hostname changed"
    echo ""
    echo "NEXT STEPS:"
    echo "1. Go to Railway Dashboard → PostgreSQL → Variables"
    echo "2. Copy the EXACT DATABASE_URL"
    echo "3. Replace in your .env file"
    echo "4. Run this script again"
else
    echo -e "${GREEN}✓ FOUND $WORKING_COUNT WORKING URL(S)!${NC}"
    echo ""
    echo -e "${GREEN}USE THIS URL IN YOUR .env:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "DATABASE_URL=\"$(echo $WORKING_URL | sed 's/:[^:@]*@/:***@/')\"" 
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Copy this to your .env file:"
    echo "  nano .env"
    echo "  # Replace DATABASE_URL line with working one above"
    echo "  # Save: Ctrl+X, Y, Enter"
    echo ""
    echo "Then run:"
    echo "  npx prisma db push"
fi

echo ""
echo "Results:"
echo "  Test 1 (No SSL):      $([ $TEST1 -eq 0 ] && echo -e '${GREEN}✓${NC}' || echo -e '${RED}✗${NC}')"
echo "  Test 2 (require):     $([ $TEST2 -eq 0 ] && echo -e '${GREEN}✓${NC}' || echo -e '${RED}✗${NC}')"
echo "  Test 3 (no-verify):   $([ $TEST3 -eq 0 ] && echo -e '${GREEN}✓${NC}' || echo -e '${RED}✗${NC}')"
echo "  Test 4 (prefer):      $([ $TEST4 -eq 0 ] && echo -e '${GREEN}✓${NC}' || echo -e '${RED}✗${NC}')"
echo "  Test 5 (disable):     $([ $TEST5 -eq 0 ] && echo -e '${GREEN}✓${NC}' || echo -e '${RED}✗${NC}')"
echo ""

