#!/bin/bash

echo "=================================="
echo "RAILWAY DATABASE DIAGNOSTIC TOOL"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check .env file exists
echo "TEST 1: Checking .env file..."
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
else
    echo -e "${RED}✗ .env file NOT FOUND!${NC}"
    exit 1
fi
echo ""

# Test 2: Check DATABASE_URL in .env
echo "TEST 2: Checking DATABASE_URL in .env..."
if grep -q "DATABASE_URL" .env; then
    echo -e "${GREEN}✓ DATABASE_URL found in .env${NC}"
    # Show URL with password partially hidden
    grep DATABASE_URL .env | sed 's/:[^:@]*@/:***@/'
else
    echo -e "${RED}✗ DATABASE_URL NOT FOUND in .env!${NC}"
    exit 1
fi
echo ""

# Test 3: Check if dotenv loads DATABASE_URL
echo "TEST 3: Testing if Node.js can load DATABASE_URL..."
DB_URL=$(node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL);")
if [ ! -z "$DB_URL" ]; then
    echo -e "${GREEN}✓ DATABASE_URL loads in Node.js${NC}"
    echo "URL length: ${#DB_URL} characters"
else
    echo -e "${RED}✗ DATABASE_URL is empty when loaded!${NC}"
    exit 1
fi
echo ""

# Test 4: Parse connection details
echo "TEST 4: Parsing connection details..."
HOST=$(echo $DB_URL | sed -n 's/.*@\(.*\):.*/\1/p')
PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
echo "Host: $HOST"
echo "Port: $PORT"
echo ""

# Test 5: Test network connectivity
echo "TEST 5: Testing network connectivity..."
if nc -zv $HOST $PORT 2>&1 | grep -q "succeeded"; then
    echo -e "${GREEN}✓ Port $PORT is OPEN and accepting connections${NC}"
else
    echo -e "${RED}✗ Cannot connect to $HOST:$PORT${NC}"
    echo "This means Railway database is down or network is blocking connection"
    exit 1
fi
echo ""

# Test 6: Check if psql is installed
echo "TEST 6: Checking PostgreSQL client..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ psql is installed${NC}"
    
    # Test 7: Try actual database connection
    echo ""
    echo "TEST 7: Testing actual PostgreSQL connection..."
    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓ ✓ ✓ DATABASE CONNECTION SUCCESSFUL! ✓ ✓ ✓${NC}"
        echo "Your database is working fine!"
        echo ""
        echo "The issue might be with Prisma. Try:"
        echo "  npx prisma generate"
        echo "  npx prisma db push"
    else
        echo -e "${RED}✗ Database connection FAILED${NC}"
        echo ""
        echo "Error details:"
        psql "$DB_URL" -c "SELECT 1;" 2>&1 | head -5
        echo ""
        echo -e "${YELLOW}Common fixes:${NC}"
        echo "1. If 'password authentication failed' → Railway changed password"
        echo "2. If 'SSL required' → Add ?sslmode=require to DATABASE_URL"
        echo "3. If 'database does not exist' → Database name changed"
        echo ""
        echo "Get fresh credentials from:"
        echo "Railway Dashboard → PostgreSQL → Variables → DATABASE_URL"
    fi
else
    echo -e "${YELLOW}⚠ psql not installed (skipping connection test)${NC}"
    echo "Install with: brew install postgresql"
fi
echo ""

# Test 8: Check Prisma files
echo "TEST 8: Checking Prisma installation..."
if [ -f "node_modules/.prisma/client/index.js" ]; then
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${YELLOW}⚠ Prisma client not generated${NC}"
    echo "Run: npx prisma generate"
fi
echo ""

# Test 9: Test with SSL parameter
echo "TEST 9: Checking if SSL is required..."
if echo "$DB_URL" | grep -q "sslmode=require"; then
    echo -e "${GREEN}✓ SSL parameter is present${NC}"
else
    echo -e "${YELLOW}⚠ SSL parameter NOT in DATABASE_URL${NC}"
    echo "Try adding: ?sslmode=require"
    echo ""
    echo "Current URL format:"
    echo "$DB_URL" | sed 's/:[^:@]*@/:***@/'
    echo ""
    echo "Should be:"
    echo "$DB_URL" | sed 's/:[^:@]*@/:***@/' | sed 's/"$/\?sslmode=require"/'
fi
echo ""

# Test 10: Final recommendation
echo "=================================="
echo "DIAGNOSIS COMPLETE"
echo "=================================="
echo ""

if nc -zv $HOST $PORT 2>&1 | grep -q "succeeded"; then
    echo -e "${GREEN}Network: OK ✓${NC}"
else
    echo -e "${RED}Network: FAILED ✗${NC}"
fi

if [ ! -z "$DB_URL" ]; then
    echo -e "${GREEN}Environment: OK ✓${NC}"
else
    echo -e "${RED}Environment: FAILED ✗${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Go to Railway Dashboard → PostgreSQL → Variables"
echo "2. Copy the exact DATABASE_URL"
echo "3. Replace in your .env file"
echo "4. Add ?sslmode=require if not present"
echo "5. Run: npx prisma db push"
echo ""

