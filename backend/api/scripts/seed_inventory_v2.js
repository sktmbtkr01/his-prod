const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const InventoryCategory = require('../models/InventoryCategory');
const InventoryStock = require('../models/InventoryStock');
const Location = require('../models/Location');
const User = require('../models/User');
const { INVENTORY_STATUS } = require('../config/constants');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // __dirname is scripts/, so ../.env is correct relative to file

const seedInventory = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Get Admin User (for createdBy)
        const adminUser = await User.findOne({ role: 'admin' });
        const userId = adminUser?._id;

        if (!userId) {
            console.error('Admin user not found. Please seed users first.');
            process.exit(1);
        }

        // 2. Create Categories (Non-Medicine)
        console.log('Seeding Categories...');
        const categoriesData = [
            { categoryName: 'Medical Consumables', categoryCode: 'CONS', description: 'Gloves, Syringes, etc.' },
            { categoryName: 'Surgical Equipment', categoryCode: 'SURG', description: 'Forceps, Scalpels, etc.' },
            { categoryName: 'Patient Care', categoryCode: 'CARE', description: 'Bedsheets, Gowns, etc.' },
            { categoryName: 'Equipment', categoryCode: 'EQUIP', description: 'Monitors, IV Stands, etc.' },
            { categoryName: 'General', categoryCode: 'GEN', description: 'Office supplies, etc.' }
        ];

        const categoriesMap = {}; // name -> _id
        for (const catData of categoriesData) {
            let cat = await InventoryCategory.findOne({ categoryCode: catData.categoryCode });
            if (!cat) {
                cat = await InventoryCategory.create({ ...catData, createdBy: userId });
            }
            categoriesMap[catData.categoryName] = cat._id;
        }

        // 3. Create Default Location (if needed)
        console.log('Checking Locations...');
        let location = await Location.findOne({ locationCode: 'MAIN_STORE' });
        if (!location) {
            location = await Location.create({
                locationName: 'Main Store',
                locationCode: 'MAIN_STORE',
                locationType: 'store',
                createdBy: userId
            });
        }

        // 4. Seed Inventory Items
        console.log('Seeding Inventory Items...');
        const itemsData = [
            {
                itemCode: 'NM-001',
                itemName: 'Surgical Gloves (Latex) - Medium',
                category: 'Medical Consumables',
                uom: 'BOX',
                reorderLevel: 50,
                maxStockLevel: 500,
                stockQty: 120,
                batch: 'BATCH-G001',
                expiry: '2026-12-31'
            },
            {
                itemCode: 'NM-002',
                itemName: 'Disposable Syringe 5ml',
                category: 'Medical Consumables',
                uom: 'BOX',
                reorderLevel: 100,
                maxStockLevel: 1000,
                stockQty: 45, // Low stock
                batch: 'BATCH-S002',
                expiry: '2027-06-30'
            },
            {
                itemCode: 'NM-003',
                itemName: 'IV Stand (Stainless Steel)',
                category: 'Equipment',
                uom: 'PCS',
                reorderLevel: 10,
                maxStockLevel: 50,
                stockQty: 15,
                batch: 'BATCH-IV003' // No expiry
            },
            {
                itemCode: 'NM-004',
                itemName: 'Wheelchair (Standard)',
                category: 'Equipment',
                uom: 'PCS',
                reorderLevel: 5,
                maxStockLevel: 20,
                stockQty: 8,
                batch: 'BATCH-W004'
            },
            {
                itemCode: 'NM-005',
                itemName: 'Oxygen Cylinder (Type B)',
                category: 'Equipment',
                uom: 'PCS',
                reorderLevel: 20,
                maxStockLevel: 100,
                stockQty: 10, // Low stock
                batch: 'BATCH-O005'
            },
            {
                itemCode: 'NM-006',
                itemName: 'Cotton Bedsheet (White)',
                category: 'Patient Care',
                uom: 'PCS',
                reorderLevel: 100,
                maxStockLevel: 500,
                stockQty: 80, // Low stock
                batch: 'BATCH-B006'
            },
            {
                itemCode: 'NM-007',
                itemName: 'patient Monitor (Vital Signs)',
                category: 'Equipment',
                uom: 'PCS',
                reorderLevel: 5,
                maxStockLevel: 25,
                stockQty: 3, // Low stock
                batch: 'BATCH-M007'
            },
            {
                itemCode: 'NM-008',
                itemName: 'PPE Kit (Full Body)',
                category: 'Medical Consumables',
                uom: 'SET',
                reorderLevel: 50,
                maxStockLevel: 300,
                stockQty: 200,
                batch: 'BATCH-P008',
                expiry: '2025-10-15'
            },
            {
                itemCode: 'NM-009',
                itemName: 'Stretcher Trolley',
                category: 'Equipment',
                uom: 'PCS',
                reorderLevel: 2,
                maxStockLevel: 10,
                stockQty: 5,
                batch: 'BATCH-S009'
            },
            {
                itemCode: 'NM-010',
                itemName: 'Surgical Scissors (Curved)',
                category: 'Surgical Equipment',
                uom: 'PCS',
                reorderLevel: 20,
                maxStockLevel: 100,
                stockQty: 60,
                batch: 'BATCH-SS010'
            },
            {
                itemCode: 'NM-011',
                itemName: 'N95 Face Mask',
                category: 'Medical Consumables',
                uom: 'BOX',
                reorderLevel: 30,
                maxStockLevel: 300,
                stockQty: 0, // Out of stock
                batch: 'BATCH-N95-011'
            }
        ];

        for (const itemData of itemsData) {
            let item = await InventoryItem.findOne({ itemCode: itemData.itemCode });

            if (!item) {
                // Create Item
                item = await InventoryItem.create({
                    itemCode: itemData.itemCode,
                    itemName: itemData.itemName,
                    category: categoriesMap[itemData.category],
                    uom: itemData.uom,
                    reorderLevel: itemData.reorderLevel,
                    maxStockLevel: itemData.maxStockLevel,
                    defaultLocation: location._id,
                    createdBy: userId
                });
                console.log(`Created Item: ${item.itemName}`);
            } else {
                console.log(`Item exists: ${item.itemName}`);
            }

            // check/create stock
            if (itemData.stockQty >= 0) {
                const stock = await InventoryStock.findOne({ item: item._id, location: location._id, batchNumber: itemData.batch });
                if (!stock) {
                    await InventoryStock.create({
                        item: item._id,
                        location: location._id,
                        quantity: itemData.stockQty,
                        availableQuantity: itemData.stockQty, // Assuming no reservations
                        batchNumber: itemData.batch,
                        expiryDate: itemData.expiry ? new Date(itemData.expiry) : null,
                        status: itemData.stockQty > 0 ? INVENTORY_STATUS.AVAILABLE : INVENTORY_STATUS.OUT_OF_STOCK,
                        createdBy: userId
                    });
                    console.log(` > Added Stock: ${itemData.stockQty} ${item.uom}`);
                }
            }
        }

        console.log('✅ Inventory Seeding Completed Successfully');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
};

seedInventory();
