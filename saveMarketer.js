const Marketer = require('./Model/marketer'); 




const marketersData = [
    { name: 'Peace Irabor', code: 'PORIA', freeSlots: 10 },
    { name: 'Kyle Numb', code: 'KYLE', freeSlots: 5 },
    { name: 'Pie Print', code: 'PIEPRINT', freeSlots: 5 },
    { name: 'Dray', code: 'CRYPTODRAY', freeSlots: 10 }
];

async function saveMarketersToDB(marketers) {
    await connectDB()
    try {
        const savedMarketers = [];

        // Loop through each marketer in the array
        for (const marketer of marketers) {
            const { name, code, freeSlots } = marketer;

            // Create a new instance of the Marketer model
            const newMarketer = new Marketer({
                name,
                code,
                freeSlots
            });

            // Save the new marketer to the database
            const savedMarketer = await newMarketer.save();

            // Push the saved marketer to the array
            savedMarketers.push(savedMarketer);
        }

        console.log('Marketers saved:', savedMarketers);
        return savedMarketers;
    } catch (error) {
        console.error('Error saving marketers:', error);
        throw error; // Propagate the error to the caller
    }
}

// Example usage:
saveMarketersToDB(marketersData)
    
