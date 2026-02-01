const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Configuration
const OLD_URI = "mongodb+srv://shravanibaraskar_db_user:R12COy0mdrk1I1l4@cluster2.fs2fnzl.mongodb.net/hospital?retryWrites=true&w=majority"; // Added database name assumption 'hospital' or 'test', will list all if possible
const BACKUP_DIR = path.join(__dirname, '../backup_data');

async function backup() {
    try {
        console.log('Connecting to old database...');
        await mongoose.connect(OLD_URI);
        console.log('Connected!');

        if (!fs.existsSync(BACKUP_DIR)){
            fs.mkdirSync(BACKUP_DIR);
        }

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        for (let collection of collections) {
            const name = collection.name;
            if (name.startsWith('system.')) continue; // Skip system collections

            console.log(`Backing up collection: ${name}...`);
            const data = await mongoose.connection.db.collection(name).find({}).toArray();
            
            fs.writeFileSync(
                path.join(BACKUP_DIR, `${name}.json`), 
                JSON.stringify(data, null, 2)
            );
            console.log(`  Saved ${data.length} documents.`);
        }

        console.log(`\nBackup completed successfully! Data saved to: ${BACKUP_DIR}`);
        process.exit(0);
    } catch (error) {
        console.error('Backup failed:', error);
        process.exit(1);
    }
}

backup();
