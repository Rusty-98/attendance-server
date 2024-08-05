import express from 'express';
import axios from 'axios';
import cheerio from 'cheerio';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORTNUM || 3000;

app.use(cors({
    origin: '*',
}));
app.use(bodyParser.json());

let attendanceRecords = []; // To store attendance data for all students

const baseFormData = {
    "__EVENTTARGET": "",
    "__EVENTARGUMENT": "",
    "__VIEWSTATE": "/wEPDwUKMTc2Mzg1NzM5Nw9kFgICAw9kFgICAw9kFgJmD2QWAgIDDxYCHgdWaXNpYmxlZxYKAgIPDxYCHgRUZXh0BQkyMjAxMDQwNzBkZAIEDw8WAh8BBQ1TV0FTVElLIFVUVEFNZGQCBg8PFgIfAQUBVmRkAggPDxYCHwEFCEJ0ZWNoLUNTZGQCCg8WAh4LXyFJdGVtQ291bnQCBRYMZg9kFgJmDxUGATEoVEhFT1JZIE9GIEFVVE9NQVRBICBBTkQgRk9STUFMIExBTkdVQUdFUwZuY3MzMDcBMAEwATBkAgEPZBYCZg8VBgEyGkRBVEFCQVNFIE1BTkFHRU1FTlQgU1lTVEVNBk5DUzMwMwEwATABMGQCAg9kFgJmDxUGATMeREVTSUdOICYgQU5BTFlTSVMgT0YgQUxHT1JJVEhNBm5jczMwNQEwATABMGQCAw9kFgJmDxUGATQRQ09NUFVURVIgTkVUV09SS1MGbmNzMzAxATABMAEwZAIED2QWAmYPFQYBNQxEQVRBIFNDSUVOQ0UGbmNzMzA5ATABMAEwZAIFD2QWBgIBDw8WAh8BBQEwZGQCAw8PFgIfAQUBMGRkAgUPDxYCHwEFAzAgJWRkZCdfTc+WQmOQPoBOybtv/sGXiIN8pruBT3EWaQ+0clMh"
};

async function fetchAttendanceData(rollNo) {
    const formData = new URLSearchParams({
        ...baseFormData,
        "hdnSessionId": "2024-2025",
        "txtRollNo": rollNo,
        "btnView": "VIEW"
    }).toString();

    try {
        const response = await axios.post('https://erp.hbtu.ac.in/StudentAttendance.aspx', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const $ = cheerio.load(response.data);

        // Extract student name
        const studentName = $('#lblStudentName').text().trim();

        // Extract attendance data
        const attendanceData = [];
        $('#Table1 tbody tr').each((index, element) => {
            const row = $(element);
            const subjectName = row.find('td').eq(1).text().trim();
            const totalLecture = row.find('td').eq(3).text().trim();
            const attendedLecture = row.find('td').eq(4).text().trim();
            const attendancePercentage = row.find('td').eq(5).text().trim();

            if (subjectName && totalLecture && attendedLecture && attendancePercentage) {
                attendanceData.push({
                    subjectName,
                    totalLecture,
                    attendedLecture,
                    attendancePercentage
                });
            }
        });

        return {
            studentName,
            attendanceData
        };
    } catch (error) {
        console.error(`Error fetching attendance data for roll number ${rollNo}:`, error);
        return null; // Return null in case of an error
    }
}

async function fetchAllAttendanceData() {
    attendanceRecords = []; // Reset the records

    for (let i = 220104001; i <= 220104075; i++) {
        const rollNo = i.toString();
        const data = await fetchAttendanceData(rollNo);
        if (data) {
            attendanceRecords.push(data);
        }
    }

    console.log('Attendance data updated:', attendanceRecords.length, 'records');
}

// Schedule the task to run every 2 hours
cron.schedule('0 */2 * * *', fetchAllAttendanceData);

// Fetch data initially on server start
fetchAllAttendanceData();

// API endpoint to get all attendance data
app.get('/attendance', (req, res) => {
    res.json(attendanceRecords);
});

app.get('/', (req, res) => {
    res.send('Server is running cool ;-)');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
