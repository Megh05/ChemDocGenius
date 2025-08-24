# Overview

ChemDoc Processor is a full-stack web application that processes chemical documents by extracting structured data from PDF files and generating company-specific documentation. The application uses AI-powered extraction through Mistral AI to parse chemical safety data sheets and product information, then allows users to review, edit, and generate new documents in various formats.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built with React 18 and TypeScript, using Vite as the build tool. The UI leverages Radix UI components with shadcn/ui for a consistent design system and Tailwind CSS for styling. The application follows a multi-step pipeline pattern for document processing:

1. **Upload Step**: File upload with drag-and-drop support
2. **Processing Step**: AI-powered extraction from PDF documents
3. **Review Step**: Interactive editing of extracted data with live preview
4. **Generate Step**: Document generation in multiple formats (PDF/DOCX)

State management is handled through React Query for server state and custom context providers for application state. The frontend includes features like document history, settings management, and real-time preview of generated documents.

## Backend Architecture
The server is an Express.js application with TypeScript that provides a REST API. It uses a modular service architecture with separate services for:

- **MistralService**: Handles AI-powered document processing and text extraction
- **DocumentGenerator**: Creates formatted documents in PDF and DOCX formats
- **FileStorage**: Manages uploaded file storage and retrieval

The backend implements an in-memory storage pattern with an interface that allows for easy migration to database storage later. The storage layer manages documents, user settings, and API configurations.

## Data Storage
Currently uses an in-memory storage implementation (`MemStorage`) that can be easily replaced with a database-backed solution. The application is configured to use PostgreSQL with Drizzle ORM, as evidenced by the schema definitions and database configuration. The data models include:

- **Documents**: Stores document metadata, extracted data, and processing status
- **Settings**: Manages API keys and connection configurations
- **Users**: User authentication and management

## External Dependencies
The application integrates with several external services and libraries:

- **Mistral AI**: Primary AI service for document processing and text extraction
- **Neon Database**: PostgreSQL database service for production data storage
- **PDF Processing**: Uses pdf-parse library for extracting text from PDF documents
- **Document Generation**: PDFKit for PDF generation and docx library for Word document creation
- **File Upload**: Multer for handling multipart form data and file uploads

The architecture supports easy swapping of AI providers and storage backends through service interfaces, making the system flexible and maintainable.