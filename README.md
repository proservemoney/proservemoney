# ProServeMoney

This is a Next.js application with authentication features for user signup and login.

## Features

- User registration with form validation
- MongoDB integration for user data storage
- Responsive UI with Tailwind CSS
- Form validation and error handling
- Authentication flow

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- MongoDB (local instance or MongoDB Atlas)

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd proserver
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   Copy the `.env.local` file and update with your MongoDB connection string and NextAuth secret:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/proservemoney
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Run the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js app directory
- `/src/app/signup` - Signup page component
- `/src/app/login` - Login page component
- `/src/app/dashboard` - Dashboard page component
- `/src/app/api` - API routes
- `/src/models` - MongoDB models
- `/src/lib` - Utility functions

## Technologies Used

- Next.js
- TypeScript
- Tailwind CSS
- MongoDB
- Mongoose
- bcryptjs for password hashing

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Payment-Required Signup Flow

This project implements a signup flow that requires payment before users can successfully log in.

### How It Works:

1. **User Registration**:
   - User creates an account with name, email, and password
   - Upon successful registration, the user is redirected to a payment page

2. **Payment Processing**:
   - User must complete payment to activate their account
   - If payment fails, the account is automatically deleted
   - If payment succeeds, the account is activated

3. **Login**:
   - When a user tries to log in, the system checks if payment has been completed
   - If payment is pending, the user is redirected to the payment page
   - If payment is completed, the user is logged in successfully

### Testing the Payment Flow:

1. Start MongoDB (required):
   ```
   # Install MongoDB or use Docker:
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. Seed the database with test users:
   ```
   npm run seed-db
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Test accounts:
   - Paid account: `paid@example.com` / `password123` (can log in successfully)
   - Unpaid account: `unpaid@example.com` / `password123` (will be redirected to payment)

5. Test payment:
   - Any valid-looking credit card details will be accepted (this is a demo)
   - For testing, use: Card number: `4242 4242 4242 4242`, any future expiry date, any CVV

### Implementation Files:

- `src/models/User.ts` - User model with payment status fields
- `src/app/api/auth/signup/route.ts` - User registration endpoint
- `src/app/api/auth/login/route.ts` - Login endpoint that checks payment status
- `src/app/api/payment/process/route.ts` - Payment processing endpoint
- `src/app/api/auth/delete-account/route.ts` - Account deletion endpoint for failed payments
- `src/app/payment/page.tsx` - Payment form UI
- `src/app/payment/success/page.tsx` - Payment success page
#   m l m - p r o s e r v e m o n e y  
 #   m l m - p r o s e r v e m o n e y  
 #   m l m - p r o s e r v e m o n e y  
 #   m l m - p r o s e r v e m o n e y  
 #   p r o s e r v e m o n e y  
 #   p r o s e r v e m o n e y  
 