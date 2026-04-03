# Auth Testing Playbook

## Step 1: Verify MongoDB
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.find({role: "user"}).pretty()
```

## Step 2: API Testing
```bash
# Login as admin
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@raport.pl","password":"Admin123!"}'

# Login as user
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pracownik@raport.pl","password":"Praca123!"}'

# Get current user (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" http://localhost:8001/api/auth/me
```

## Step 3: Questions API
```bash
# Get active questions
curl -H "Authorization: Bearer TOKEN" http://localhost:8001/api/questions

# Get all questions (admin)
curl -H "Authorization: Bearer TOKEN" http://localhost:8001/api/questions/all
```

## Step 4: Reports API
```bash
# Create report
curl -X POST http://localhost:8001/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"date":"01/01/2026","answers":[{"question_id":"q1","question_text":"Test?","answer":"Odpowiedź"}]}'

# Get open report
curl -H "Authorization: Bearer TOKEN" http://localhost:8001/api/reports/open
```
