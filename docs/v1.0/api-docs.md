RESUME MANAGEMENT SYSTEM - API DOCUMENTATION

API ENDPOINTS
------------
1. Submit Resume
   URL: /api/submit
   Method: POST
   Content-Type: multipart/form-data
   
   Fields:
   - fullName (string, required)
   - email (string, required)
   - phone (string, required)
   - experience (number, required)
   - resume (file, required)
   
   Response:
   {
     "success": true,
     "submission": {
       "id": "timestamp",
       "fullName": "string",
       "email": "string",
       ...
     }
   }

2. Get Submissions
   URL: /api/submissions
   Method: GET
   
   Response: Array of submissions

3. Download Resume
   URL: /api/resume/:id
   Method: GET
   
   Response: File download

ERROR CODES
----------
- 400: Bad Request (Invalid input)
- 404: Not Found (Resume/Submission not found)
- 413: Payload Too Large (File too big)
- 415: Unsupported Media Type (Wrong file type)
- 500: Server Error