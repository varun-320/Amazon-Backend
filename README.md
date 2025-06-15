# 🛒 Amazon Clone - Backend

This is the backend API for my Amazon-like E-commerce web application. Built with Node.js, Express.js, and MongoDB, it provides secure RESTful APIs to power the frontend client, handle business logic, data storage, and authentication.

---

## 🚀 Live Deployment

✅ **Backend API is live and running at:**  
🌐 [https://your-backend-deployment-url.com](https://your-backend-deployment-url.com)

> 🔧 Replace this link with your actual deployed backend URL.

---

## ✨ Features

- User Registration & Login (JWT Authentication)
- User Profile & Account Management
- Product CRUD Operations
- Order Management System
- Payment Integration Ready
- Admin Panel APIs (Users, Products, Orders)
- MongoDB Database with Mongoose ODM
- Secure REST API for frontend integration
- Password encryption with Bcrypt
- Full error handling & validations

---

## ⚙️ Tech Stack

| Technology | Description |
| ----------- | ----------- |
| Node.js | Backend Runtime |
| Express.js | Web Framework |
| MongoDB | NoSQL Database |
| Mongoose | ODM for MongoDB |
| JWT | Authentication |
| Bcrypt | Password Hashing |
| Multer / Cloudinary | Image Upload (optional) |
| Cors / Dotenv | Config & Middleware |

---

## 📂 Project Structure

---

- Amazon-Backend/
- ├── config/        # Configuration files
- ├── controllers/   # Route Controllers
- ├── middleware/    # Authentication & Error Handlers
- ├── models/        # Mongoose Models
- ├── routes/        # API Routes
- ├── utils/         # Utility functions
- ├── server.js      # Entry Point
- └── .env           # Environment Variables
## 🚀 Getting Started (For Local Development)
## 1️⃣ Clone the Repository
- git clone https://github.com/varun-320/Amazon-Backend.git
- cd Amazon-Backend
## 2️⃣ Install Dependencies
- npm install
## 3️⃣ Setup Environment Variables
- Create a .env file in the root directory:
---
- env
- PORT=5000
- MONGO_URI=your_mongodb_connection_string
- JWT_SECRET=your_jwt_secret_key
- Replace with your actual MongoDB connection string and JWT secret.

---

## 4️⃣ Run the Server
- For development:
- npm run dev
- Server will run locally at:
- http://localhost:5000
## 📡 API Endpoints
- Endpoint	Description
- /api/users	User Registration, Login, Profile
- /api/products	Product CRUD Operations
- /api/orders	Order Management
- /api/admin	Admin Functions

---

## 🔗 Frontend Repository
- 👉 Amazon-Frontend

## 🌐 Deployment
- The backend is deployed and accessible from anywhere via the provided deployed URL. You can deploy using:

- Render (recommended for Node.js)

## 👨‍💻 Author
- Developed with ❤️ by Varun Shetty

## 📄 License
- This project is licensed under the MIT License.
