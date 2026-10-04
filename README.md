# 🍴 Taste of Heaven

### Full-Stack Recipe Sharing & AI Review Analysis Platform

<p align="center">
  <strong>Discover • Cook • Share • Review</strong>
</p>

<p align="center">
  A full-stack recipe platform built with React.js, Node.js, Express.js, MongoDB and n8n-powered AI automation.
</p>

<p align="center">

  <a href="https://taste-of-heaven-phi.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Taste%20of%20Heaven-16A34A?style=for-the-badge" alt="Live Demo">
  </a>

  <img src="https://img.shields.io/badge/React.js-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">

  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">

  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">

  <img src="https://img.shields.io/badge/n8n-Automation-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n">

</p>

---

# 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Live Demo](#-live-demo)
- [Project Highlights](#-project-highlights)
- [Features](#-features)
- [AI Review Analysis](#-ai-review-analysis)
- [Admin Dashboard](#-admin-dashboard)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Application Workflow](#-application-workflow)
- [Database Design](#-database-design)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the Project](#-running-the-project)
- [API Overview](#-api-overview)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Security](#-security)
- [Future Enhancements](#-future-enhancements)
- [Learning Outcomes](#-learning-outcomes)
- [Author](#-author)

---

# 🍽️ About the Project

**Taste of Heaven** is a full-stack recipe sharing platform designed to provide users with an interactive and personalized recipe discovery experience.

Users can browse recipes, search and filter recipes, view cooking instructions, rate recipes, write reviews, save favorite recipes, and manage their profiles.

The platform also integrates an **AI-powered review analysis workflow using n8n**, which analyzes user reviews and generates useful insights such as:

- Sentiment
- Category
- Keywords
- Summary

The application also provides a dedicated **role-based admin dashboard** for managing recipes, users, reviews, favorites, cuisines, and platform analytics.

---

# 🌐 Live Demo

### Live Website

https://taste-of-heaven-phi.vercel.app/

### Frontend

Deployed using **Vercel**

### Backend

Deployed using **Render**

### Database

Hosted using **MongoDB Atlas**

---

# 🚀 Project Highlights

- Full-stack MERN application
- Responsive recipe discovery platform
- RESTful backend APIs
- MongoDB database integration
- Google OAuth 2.0 authentication
- bcrypt password authentication
- Server-side session management
- HTTP-only cookies
- Role-based admin authorization
- Recipe CRUD operations
- User-specific favorites
- Recipe ratings and reviews
- AI-powered review analysis
- n8n workflow automation
- Admin analytics dashboard
- Cloud deployment

---

# ✨ Features

## 👨‍🍳 User Features

### Recipe Discovery

Users can:

- Browse available recipes
- Search recipes
- Filter recipes
- Explore recipes by cuisine
- Explore vegetarian and non-vegetarian recipes
- View detailed recipe information

---

## 🔎 Recipe Search & Filtering

Users can search recipes based on:

- Recipe name
- Ingredients
- Cuisine
- Recipe type

The filtering system makes it easier to discover relevant recipes.

---

## ⭐ Ratings & Reviews

Users can:

- Rate recipes
- Write reviews
- View existing reviews
- Delete their own reviews
- View review sentiment information

---

## ❤️ Favorites

Authenticated users can:

- Add recipes to favorites
- Remove recipes from favorites
- View their favorite recipes
- Maintain a personalized collection of recipes

---

## 👤 Profile Management

Users can:

- View their profile
- Update profile information
- Manage their account
- View personalized interactions

---

# 🔐 Authentication & Authorization

The application supports multiple authentication mechanisms.

## Google OAuth 2.0

Users can authenticate using their Google account.

The OAuth workflow includes:

```text
User
 ↓
Google Login
 ↓
OAuth Authorization
 ↓
Authorization Code
 ↓
Backend
 ↓
Token Verification
 ↓
User Account
 ↓
Authenticated Session
