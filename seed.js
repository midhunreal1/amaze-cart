require('dotenv').config();
const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URI;
const dbName = 'shopping';

const sampleProducts = [
  {
    Name: "iPhone 15 Pro",
    Description: "Latest Apple smartphone with A17 Pro chip and titanium design",
    Price: "99999",
    Category: "Electronics",
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop"
  },
  {
    Name: "Samsung Galaxy S24",
    Description: "Flagship Android phone with AI features and excellent camera",
    Price: "75999",
    Category: "Electronics",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop"
  },
  {
    Name: "MacBook Air M2",
    Description: "Lightweight laptop with Apple M2 chip, perfect for productivity",
    Price: "119900",
    Category: "Computers",
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&h=500&fit=crop"
  },
  {
    Name: "Sony WH-1000XM5",
    Description: "Premium noise-canceling wireless headphones",
    Price: "29990",
    Category: "Audio",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop"
  },
  {
    Name: "Nike Air Max 270",
    Description: "Comfortable running shoes with Max Air cushioning",
    Price: "12995",
    Category: "Footwear",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop"
  },
  {
    Name: "Levi's 501 Jeans",
    Description: "Classic straight-fit denim jeans",
    Price: "4999",
    Category: "Clothing",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&h=500&fit=crop"
  }
];

const bcrypt = require('bcrypt');

async function createSampleUsers() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return [
    {
      Name: "John Doe",
      Email: "john@example.com",
      Password: hashedPassword
    },
    {
      Name: "Jane Smith",
      Email: "jane@example.com",  
      Password: hashedPassword
    }
  ];
}

async function seedDatabase() {
  try {
    const client = new MongoClient(url);
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db(dbName);

    // Clear existing data
    console.log('Clearing existing data...');
    await db.collection('product').deleteMany({});
    await db.collection('user').deleteMany({});
    await db.collection('cart').deleteMany({});
    await db.collection('order').deleteMany({});

    // Insert sample products
    console.log('Inserting sample products...');
    const productResult = await db.collection('product').insertMany(sampleProducts);
    console.log(`${productResult.insertedCount} products inserted`);

    // Insert sample users
    console.log('Inserting sample users...');
    const sampleUsers = await createSampleUsers();
    const userResult = await db.collection('user').insertMany(sampleUsers);
    console.log(`${userResult.insertedCount} users inserted`);

    console.log('✅ Database seeded successfully!');
    console.log('📱 Products: iPhone 15 Pro, Samsung Galaxy S24, MacBook Air M2, Sony WH-1000XM5, Nike Air Max 270, Levi\'s 501 Jeans');
    console.log('👥 Users: john@example.com, jane@example.com (password: password123)');

    await client.close();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

seedDatabase();