#  MindCare

A comprehensive web-based application designed to support individuals experiencing mental health challenges through medication management, appointment scheduling, and peer support via a moderated community forum.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)](https://www.postgresql.org/)

---

##  Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Security Features](#security-features)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)
- [Contact & Support](#contact--support)
- [Project Status](#project-status)

---

##  Overview

The **Mental Health Support Application** is a full-stack project developed as part of a software engineering course.  
It focuses on **requirements engineering**, **project planning**, **system implementation**, and **testing**.

This platform enables users to:
- Maintain secure health and medical records  
- Manage medications and appointments  
- Interact safely with a moderated mental health support community  
- Receive notifications and reminders  
---

##  Features

###  Authentication & Security
- Secure registration & login using **JWT**
- Password hashing with **bcrypt**
- AES-256 encryption for sensitive data
- Protected routes and middleware authorization

###  Health Management
- CRUD operations for medical history (diagnoses, allergies, conditions)
- Manage medications with reminder schedules
- Add, update, and cancel appointments

###  Community Forum
- Peer-to-peer discussion board
- AI-powered moderation for user safety
- Ability to post, comment, and delete discussions

###  Notifications
- Real-time notifications for medications and appointments
- In-app and push reminders
- Notification center for viewing all alerts

###  Dashboard
- Displays upcoming appointments
- Medication schedules and reminder summaries

---

##  Technology Stack

**Backend**
- Node.js (v18+)
- Express.js
- PostgreSQL
- JWT, bcrypt, AES encryption
- node-cron for reminders

**Frontend**
- React (v18.2)
- React Router DOM
- Bootstrap 5
- React Toastify
- Axios for API communication

**Testing**
- Jest
- Supertest

**Documentation & Planning**
- StarUML (UML diagrams)
- Microsoft Project (Gantt chart & schedule)

---

##  Prerequisites

Ensure these are installed:

node --version  # v18+
npm --version   # v8+
psql --version  # v12+



##  Installation

##  Fork and Clone The Repository

git clone [https:(https://github.com/OgechaEnock/MindCare)
cd mental-health-app

##  Backend Setup

cd backend
npm install

##  Frontend Setup

cd frontend
npm install

##   Backend Configuration

PORT=3000
DB_USER=patient
DB_PASSWORD=your_password
DB_NAME=mental_health_db
DB_HOST=localhost
DB_PORT=5432
ENCRYPTION_KEY=12345678901234567890123456789012
JWT_SECRET=super_secure_random_secret
FRONTEND_URL=http://localhost:3001

##   Frontend Configuration

REACT_APP_API_URL=http://localhost:3000

##  Database Setup
Run
CREATE DATABASE mental_health_db;

##  Run Schema
psql -U patient -d mental_health_db -f schema.sql

## Running the Application Backend
cd backend
npm run dev

## Running the Application Frontend
cd frontend
npm start


