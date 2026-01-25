const mongoose = require('mongoose');
const RiskScoreHistory = require('./models/RiskScoreHistory');
const Appointment = require('./models/Appointment');
const VitalSigns = require('./models/VitalSigns');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/hospital_management_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log('✅ Connected to DB');
        await checkLatestHistory();
        mongoose.connection.close();
    })
    .catch(err => {
        console.error('❌ DB Connection Error:', err);
    });

async function checkLatestHistory() {
    try {
        // Get latest appointment
        const appointment = await Appointment.findOne().sort({ createdAt: -1 });
        if (!appointment) {
            console.log('No appointments found');
            return;
        }

        console.log('\n📅 LATEST APPOINTMENT');
        console.log('ID:', appointment._id.toString());
        console.log('Patient:', appointment.patient.toString());
        console.log('Risk Score:', appointment.finalRiskScore);
        console.log('Category:', appointment.riskCategory);
        console.log('Link:', `http://localhost:5173/dashboard/emr/${appointment.patient}`);

        // Check Vitals
        const vitals = await VitalSigns.findOne({ appointment: appointment._id });
        console.log('\n💓 VITALS');
        if (vitals) {
            console.log('ID:', vitals._id.toString());
            console.log('NEWS2 Score:', vitals.news2Score);
        } else {
            console.log('No vitals recorded');
        }

        // Check History
        const history = await RiskScoreHistory.find({ encounter: appointment._id }).sort({ createdAt: -1 });
        console.log('\n📜 RISK HISTORY (' + history.length + ')');
        history.forEach(h => {
            console.log(`- [${h.source}] ${h.createdAt.toISOString()} | Score: ${h.newFinalRiskScore} | ${h.selectedRiskLevel || ''}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}
