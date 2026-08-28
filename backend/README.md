# ⚙️ BSI CRG Task Dashboard - Backend API

Backend RESTful API service built with **NestJS**, **Prisma ORM**, and **PostgreSQL** for the BSI CRG Task & Project Monitoring Dashboard.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (.env)
Create a `.env` file in the root of the `backend/` directory:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/crg_dashboard?schema=public"
PORT=3000

MAIL_HOST="smtp.gmail.com"
MAIL_USER="your_email@gmail.com"
MAIL_PASS="your_gmail_app_password"
MAIL_FROM="your_email@gmail.com"
```

### 3. Database Migration & Seeding
```bash
# Run migrations
npx prisma migrate dev --name init

# Seed database with super admin & sample projects
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run start:dev
```
Server will be available at `http://localhost:3000`.

---

## 📡 API Endpoints Overview

| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/login` | Login and obtain JWT token |
| | `GET` | `/auth/me` | Get authenticated user profile & password expiry |
| | `POST` | `/auth/forgot-password` | Request password reset OTP via email |
| | `POST` | `/auth/reset-password` | Reset password using OTP code |
| | `POST` | `/auth/request-change-password-otp` | Request OTP to change password |
| | `PATCH`| `/auth/change-password` | Verify OTP and update password |
| **Projects** | `GET` | `/project` | Get all projects with timeline & task relations |
| | `POST` | `/project` | Create a new project |
| | `PATCH`| `/project/:id` | Update project details / advance SDLC phase |
| | `DELETE`| `/project/:id` | Delete a project (cascade) |
| | `POST` | `/project/cycle/:id` | Advance project to next cycle |
| **Timeline** | `POST` | `/project/log` | Add weekly progress log |
| | `PATCH`| `/project/task/:id/toggle` | Toggle task completion |
| **QA / UAT** | `GET` | `/project/:id/test-cases` | Get test cases for a project |
| | `POST` | `/project/test-case` | Create test case |
| | `PATCH`| `/project/test-case/:id` | Update test case & defects |
| **PIR** | `GET` | `/project/issue` | Get all live issues |
| | `POST` | `/project/issue` | Report a live issue |
| | `POST` | `/project/improvement` | Add an improvement note |
| **Audit** | `GET` | `/audit` | Get recent activity audit logs |
| **Users** | `GET` | `/users` | Get user list (Admin only) |
| | `POST` | `/users` | Create user (Admin only) |
| | `PATCH`| `/users/:id/reset-password` | Admin reset password |


## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
