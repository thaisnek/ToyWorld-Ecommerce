# ToyWorld E-commerce

ToyWorld E-commerce is a full-stack toy store web application built with React and Spring Boot.  
The project demonstrates a complete e-commerce workflow, including product browsing, cart, checkout, order management, shipment management, reviews, vouchers, loyalty points, and role-based admin operations.

## Tech Stack

### Frontend
- React
- Vite
- React Router
- CSS

### Backend
- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- MySQL
- JWT Authentication

### Payment
- COD payment
- MoMo sandbox integration structure for local testing

## Main Features

### Customer
- Register and login
- Browse products by category
- Search and filter products
- View product details
- Add products to cart
- Checkout with COD or MoMo sandbox flow
- View order history
- Cancel eligible orders
- Confirm received orders
- Review purchased products
- Track loyalty points
- Message admin/support

### Admin / Staff
- Dashboard with revenue and product statistics
- Product management
- Category tree management
- Supplier management
- User and role management
- Order confirmation and cancellation
- Shipment assignment and delivery status updates
- Review moderation
- Voucher and voucher type management
- Loyalty management
- Customer message management

## Business Rules

- Products are assigned to leaf categories only.
- Parent categories are used for grouping and filtering.
- Public product pages only show active products.
- Admin product pages can manage active and inactive products.
- Revenue and sold quantity are counted only when an order is completed.
- Shipment assignment and delivery status are managed from the shipment page.
- Online payment orders must be paid before confirmation or shipment.
- Cancelled orders restore stock and release voucher usage.
- Delivered orders can be automatically completed after a configured period.
