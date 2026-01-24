/**
 * Seed Medicine Master Data
 * Run with: node seed_medicines.js
 * Creates 60+ commonly used medicines in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function seedMedicines() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Medicine = require('./models/Medicine');

        // Comprehensive list of common medicines
        const medicines = [
            // Analgesics / Pain Relief
            { name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Analgesic', form: 'Tablet', strength: '500mg' },
            { name: 'Paracetamol 650mg', genericName: 'Acetaminophen', category: 'Analgesic', form: 'Tablet', strength: '650mg' },
            { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'Anti-inflammatory', form: 'Tablet', strength: '400mg' },
            { name: 'Diclofenac 50mg', genericName: 'Diclofenac', category: 'Anti-inflammatory', form: 'Tablet', strength: '50mg' },
            { name: 'Aspirin 75mg', genericName: 'Aspirin', category: 'Analgesic', form: 'Tablet', strength: '75mg' },
            { name: 'Tramadol 50mg', genericName: 'Tramadol', category: 'Analgesic', form: 'Tablet', strength: '50mg' },
            { name: 'Aceclofenac 100mg', genericName: 'Aceclofenac', category: 'Anti-inflammatory', form: 'Tablet', strength: '100mg' },

            // Antibiotics
            { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic', form: 'Capsule', strength: '500mg' },
            { name: 'Azithromycin 500mg', genericName: 'Azithromycin', category: 'Antibiotic', form: 'Tablet', strength: '500mg' },
            { name: 'Ciprofloxacin 500mg', genericName: 'Ciprofloxacin', category: 'Antibiotic', form: 'Tablet', strength: '500mg' },
            { name: 'Cefixime 200mg', genericName: 'Cefixime', category: 'Antibiotic', form: 'Tablet', strength: '200mg' },
            { name: 'Doxycycline 100mg', genericName: 'Doxycycline', category: 'Antibiotic', form: 'Capsule', strength: '100mg' },
            { name: 'Metronidazole 400mg', genericName: 'Metronidazole', category: 'Antibiotic', form: 'Tablet', strength: '400mg' },
            { name: 'Levofloxacin 500mg', genericName: 'Levofloxacin', category: 'Antibiotic', form: 'Tablet', strength: '500mg' },
            { name: 'Ofloxacin 200mg', genericName: 'Ofloxacin', category: 'Antibiotic', form: 'Tablet', strength: '200mg' },

            // Antacids / GI
            { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'Antacid', form: 'Capsule', strength: '20mg' },
            { name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', category: 'Antacid', form: 'Tablet', strength: '40mg' },
            { name: 'Ranitidine 150mg', genericName: 'Ranitidine', category: 'Antacid', form: 'Tablet', strength: '150mg' },
            { name: 'Rabeprazole 20mg', genericName: 'Rabeprazole', category: 'Antacid', form: 'Tablet', strength: '20mg' },
            { name: 'Domperidone 10mg', genericName: 'Domperidone', category: 'Gastrointestinal', form: 'Tablet', strength: '10mg' },
            { name: 'Ondansetron 4mg', genericName: 'Ondansetron', category: 'Gastrointestinal', form: 'Tablet', strength: '4mg' },
            { name: 'Antacid Gel', genericName: 'Aluminium Hydroxide + Magnesium', category: 'Antacid', form: 'Suspension', strength: '170ml' },

            // Antidiabetics
            { name: 'Metformin 500mg', genericName: 'Metformin', category: 'Antidiabetic', form: 'Tablet', strength: '500mg' },
            { name: 'Metformin 850mg', genericName: 'Metformin', category: 'Antidiabetic', form: 'Tablet', strength: '850mg' },
            { name: 'Glimepiride 1mg', genericName: 'Glimepiride', category: 'Antidiabetic', form: 'Tablet', strength: '1mg' },
            { name: 'Glimepiride 2mg', genericName: 'Glimepiride', category: 'Antidiabetic', form: 'Tablet', strength: '2mg' },
            { name: 'Sitagliptin 100mg', genericName: 'Sitagliptin', category: 'Antidiabetic', form: 'Tablet', strength: '100mg' },

            // Antihypertensives
            { name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'Antihypertensive', form: 'Tablet', strength: '5mg' },
            { name: 'Amlodipine 10mg', genericName: 'Amlodipine', category: 'Antihypertensive', form: 'Tablet', strength: '10mg' },
            { name: 'Losartan 50mg', genericName: 'Losartan', category: 'Antihypertensive', form: 'Tablet', strength: '50mg' },
            { name: 'Telmisartan 40mg', genericName: 'Telmisartan', category: 'Antihypertensive', form: 'Tablet', strength: '40mg' },
            { name: 'Atenolol 50mg', genericName: 'Atenolol', category: 'Antihypertensive', form: 'Tablet', strength: '50mg' },
            { name: 'Enalapril 5mg', genericName: 'Enalapril', category: 'Antihypertensive', form: 'Tablet', strength: '5mg' },
            { name: 'Metoprolol 50mg', genericName: 'Metoprolol', category: 'Antihypertensive', form: 'Tablet', strength: '50mg' },

            // Antihistamines
            { name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Antihistamine', form: 'Tablet', strength: '10mg' },
            { name: 'Levocetirizine 5mg', genericName: 'Levocetirizine', category: 'Antihistamine', form: 'Tablet', strength: '5mg' },
            { name: 'Fexofenadine 120mg', genericName: 'Fexofenadine', category: 'Antihistamine', form: 'Tablet', strength: '120mg' },
            { name: 'Chlorpheniramine 4mg', genericName: 'Chlorpheniramine', category: 'Antihistamine', form: 'Tablet', strength: '4mg' },

            // Respiratory
            { name: 'Salbutamol 2mg', genericName: 'Salbutamol', category: 'Bronchodilator', form: 'Tablet', strength: '2mg' },
            { name: 'Salbutamol Inhaler', genericName: 'Salbutamol', category: 'Bronchodilator', form: 'Inhaler', strength: '100mcg' },
            { name: 'Montelukast 10mg', genericName: 'Montelukast', category: 'Respiratory', form: 'Tablet', strength: '10mg' },
            { name: 'Budesonide Inhaler', genericName: 'Budesonide', category: 'Respiratory', form: 'Inhaler', strength: '200mcg' },
            { name: 'Dextromethorphan Syrup', genericName: 'Dextromethorphan', category: 'Respiratory', form: 'Syrup', strength: '100ml' },

            // Steroids
            { name: 'Prednisolone 5mg', genericName: 'Prednisolone', category: 'Steroid', form: 'Tablet', strength: '5mg' },
            { name: 'Prednisolone 10mg', genericName: 'Prednisolone', category: 'Steroid', form: 'Tablet', strength: '10mg' },
            { name: 'Dexamethasone 0.5mg', genericName: 'Dexamethasone', category: 'Steroid', form: 'Tablet', strength: '0.5mg' },
            { name: 'Hydrocortisone Cream', genericName: 'Hydrocortisone', category: 'Steroid', form: 'Cream', strength: '1%' },

            // Vitamins & Supplements
            { name: 'Vitamin B Complex', genericName: 'B Vitamins', category: 'Vitamin', form: 'Tablet', strength: '' },
            { name: 'Vitamin C 500mg', genericName: 'Ascorbic Acid', category: 'Vitamin', form: 'Tablet', strength: '500mg' },
            { name: 'Vitamin D3 60000 IU', genericName: 'Cholecalciferol', category: 'Vitamin', form: 'Capsule', strength: '60000 IU' },
            { name: 'Calcium + D3', genericName: 'Calcium Carbonate + D3', category: 'Nutritional', form: 'Tablet', strength: '500mg' },
            { name: 'Iron + Folic Acid', genericName: 'Ferrous Fumarate', category: 'Nutritional', form: 'Tablet', strength: '100mg' },
            { name: 'Multivitamin Tablet', genericName: 'Multivitamins', category: 'Vitamin', form: 'Tablet', strength: '' },
            { name: 'Zinc 50mg', genericName: 'Zinc Sulfate', category: 'Nutritional', form: 'Tablet', strength: '50mg' },

            // Cardiac
            { name: 'Clopidogrel 75mg', genericName: 'Clopidogrel', category: 'Cardiac', form: 'Tablet', strength: '75mg' },
            { name: 'Atorvastatin 10mg', genericName: 'Atorvastatin', category: 'Cardiac', form: 'Tablet', strength: '10mg' },
            { name: 'Atorvastatin 20mg', genericName: 'Atorvastatin', category: 'Cardiac', form: 'Tablet', strength: '20mg' },
            { name: 'Rosuvastatin 10mg', genericName: 'Rosuvastatin', category: 'Cardiac', form: 'Tablet', strength: '10mg' },
            { name: 'Digoxin 0.25mg', genericName: 'Digoxin', category: 'Cardiac', form: 'Tablet', strength: '0.25mg' },

            // Muscle Relaxants
            { name: 'Thiocolchicoside 4mg', genericName: 'Thiocolchicoside', category: 'Muscle Relaxant', form: 'Capsule', strength: '4mg' },
            { name: 'Cyclobenzaprine 10mg', genericName: 'Cyclobenzaprine', category: 'Muscle Relaxant', form: 'Tablet', strength: '10mg' },

            // Psychiatric / Neurological
            { name: 'Alprazolam 0.25mg', genericName: 'Alprazolam', category: 'Psychiatric', form: 'Tablet', strength: '0.25mg' },
            { name: 'Clonazepam 0.5mg', genericName: 'Clonazepam', category: 'Psychiatric', form: 'Tablet', strength: '0.5mg' },
            { name: 'Sertraline 50mg', genericName: 'Sertraline', category: 'Psychiatric', form: 'Tablet', strength: '50mg' },
            { name: 'Escitalopram 10mg', genericName: 'Escitalopram', category: 'Psychiatric', form: 'Tablet', strength: '10mg' },

            // Ophthalmic
            { name: 'Ciprofloxacin Eye Drops', genericName: 'Ciprofloxacin', category: 'Ophthalmic', form: 'Drops', strength: '0.3%' },
            { name: 'Moxifloxacin Eye Drops', genericName: 'Moxifloxacin', category: 'Ophthalmic', form: 'Drops', strength: '0.5%' },

            // Antifungals
            { name: 'Fluconazole 150mg', genericName: 'Fluconazole', category: 'Antifungal', form: 'Tablet', strength: '150mg' },
            { name: 'Clotrimazole Cream', genericName: 'Clotrimazole', category: 'Antifungal', form: 'Cream', strength: '1%' },

            // Diuretics
            { name: 'Furosemide 40mg', genericName: 'Furosemide', category: 'Diuretic', form: 'Tablet', strength: '40mg' },
            { name: 'Spironolactone 25mg', genericName: 'Spironolactone', category: 'Diuretic', form: 'Tablet', strength: '25mg' },

            // Laxatives
            { name: 'Lactulose Syrup', genericName: 'Lactulose', category: 'Laxative', form: 'Syrup', strength: '100ml' },
            { name: 'Isabgol Husk', genericName: 'Psyllium', category: 'Laxative', form: 'Powder', strength: '100g' }
        ];

        console.log(`\nSeeding ${medicines.length} medicines...`);

        let created = 0;
        let skipped = 0;

        for (const med of medicines) {
            try {
                await Medicine.findOneAndUpdate(
                    { name: med.name },
                    { ...med, isActive: true },
                    { upsert: true, new: true }
                );
                console.log(`  ✓ ${med.name}`);
                created++;
            } catch (err) {
                if (err.code === 11000) {
                    console.log(`  ⊘ ${med.name} (already exists)`);
                    skipped++;
                } else {
                    console.error(`  ✗ ${med.name}: ${err.message}`);
                }
            }
        }

        console.log(`\n✅ Medicine seeding complete!`);
        console.log(`   Created/Updated: ${created}`);
        console.log(`   Skipped: ${skipped}`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

seedMedicines();
