import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Your Shikshak Management System API',
    version: '1.0.0',
    description:
      'RESTful API for Your Shikshak EdTech platform with role-based access control (Admin, Manager, Teacher, Coordinator, Student)',
    contact: {
      name: 'API Support',
      email: 'support@yourshikshak.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server',
    },
    {
      url: 'https://api.yourshikshak.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from /api/v1/auth/login or /api/v1/auth/register',
      },
    },
    schemas: {
      // User Schema
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'MongoDB ObjectId',
            example: '507f1f77bcf86cd799439011',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john.doe@example.com',
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'teacher', 'coordinator', 'student'],
            example: 'student',
          },
          profile: {
            type: 'object',
            properties: {
              firstName: {
                type: 'string',
                example: 'John',
              },
              lastName: {
                type: 'string',
                example: 'Doe',
              },
              phone: {
                type: 'string',
                example: '+1234567890',
              },
              avatar: {
                type: 'string',
                format: 'uri',
                example: 'https://res.cloudinary.com/example/image/upload/v1234567890/avatar.jpg',
              },
              dateOfBirth: {
                type: 'string',
                format: 'date',
                example: '2000-01-15',
              },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string', example: '123 Main St' },
                  city: { type: 'string', example: 'New York' },
                  state: { type: 'string', example: 'NY' },
                  zipCode: { type: 'string', example: '10001' },
                  country: { type: 'string', example: 'USA' },
                },
              },
            },
            required: ['firstName', 'lastName'],
          },
          isActive: {
            type: 'boolean',
            example: true,
          },
          isEmailVerified: {
            type: 'boolean',
            example: false,
          },
          lastLogin: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
          },
        },
      },
      // Course Schema
      Course: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          name: {
            type: 'string',
            example: 'Introduction to Mathematics',
          },
          description: {
            type: 'string',
            example: 'Comprehensive math course for grade 10 covering algebra, geometry, and trigonometry',
          },
          code: {
            type: 'string',
            example: 'MATH101',
          },
          teacher: {
            type: 'string',
            description: 'ObjectId reference to User',
            example: '507f1f77bcf86cd799439012',
          },
          students: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Array of ObjectId references to User',
            example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
          },
          maxStudents: {
            type: 'number',
            example: 30,
          },
          schedule: {
            type: 'object',
            properties: {
              daysOfWeek: {
                type: 'array',
                items: { type: 'string' },
                example: ['monday', 'wednesday', 'friday'],
              },
              startTime: {
                type: 'string',
                example: '09:00',
              },
              endTime: {
                type: 'string',
                example: '10:30',
              },
              duration: {
                type: 'number',
                example: 90,
              },
            },
          },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'archived', 'completed'],
            example: 'active',
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            example: '2024-02-01T00:00:00Z',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            example: '2024-06-30T23:59:59Z',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['mathematics', 'grade-10', 'algebra'],
          },
          prerequisites: {
            type: 'array',
            items: { type: 'string' },
            example: ['MATH100'],
          },
          syllabus: {
            type: 'string',
            example: 'Course syllabus content...',
          },
          approvalStatus: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'auto_approved'],
            example: 'approved',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:00:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:00:00Z',
          },
        },
      },
      // Assignment Schema
      Assignment: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          title: {
            type: 'string',
            example: 'Homework 1: Algebra Basics',
          },
          description: {
            type: 'string',
            example: 'Complete exercises 1-10 from chapter 3',
          },
          course: {
            type: 'string',
            description: 'ObjectId reference to Course',
            example: '507f1f77bcf86cd799439012',
          },
          teacher: {
            type: 'string',
            description: 'ObjectId reference to User',
            example: '507f1f77bcf86cd799439013',
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            example: '2024-12-31T23:59:59Z',
          },
          publishDate: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T00:00:00Z',
          },
          maxGrade: {
            type: 'number',
            example: 100,
          },
          attachments: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            example: ['https://example.com/file1.pdf'],
          },
          instructions: {
            type: 'string',
            example: 'Submit your work as a PDF file',
          },
          allowLateSubmission: {
            type: 'boolean',
            example: false,
          },
          lateSubmissionPenalty: {
            type: 'number',
            example: 10,
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'closed', 'graded'],
            example: 'published',
          },
          submissions: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Submission',
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:00:00Z',
          },
        },
      },
      // Submission Schema
      Submission: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          student: {
            type: 'string',
            description: 'ObjectId reference to User',
            example: '507f1f77bcf86cd799439012',
          },
          submittedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-12-30T15:30:00Z',
          },
          status: {
            type: 'string',
            enum: ['not_submitted', 'submitted', 'graded', 'late', 'resubmitted'],
            example: 'submitted',
          },
          attachments: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            example: ['https://example.com/submission.pdf'],
          },
          content: {
            type: 'string',
            example: 'Assignment submission content...',
          },
          grade: {
            type: 'number',
            example: 85,
          },
          maxGrade: {
            type: 'number',
            example: 100,
          },
          feedback: {
            type: 'string',
            example: 'Good work! Minor improvements needed.',
          },
          gradedBy: {
            type: 'string',
            description: 'ObjectId reference to User',
            example: '507f1f77bcf86cd799439013',
          },
          gradedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-12-31T10:00:00Z',
          },
          isLate: {
            type: 'boolean',
            example: false,
          },
        },
      },
      // Grade Schema
      Grade: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          student: {
            type: 'string',
            description: 'ObjectId reference to User',
            example: '507f1f77bcf86cd799439012',
          },
          course: {
            type: 'string',
            description: 'ObjectId reference to Course',
            example: '507f1f77bcf86cd799439013',
          },
          assignment: {
            type: 'string',
            description: 'ObjectId reference to Assignment',
            example: '507f1f77bcf86cd799439014',
          },
          gradeType: {
            type: 'string',
            enum: ['assignment', 'manual', 'exam', 'quiz', 'participation', 'project', 'attendance', 'final'],
            example: 'assignment',
          },
          score: {
            type: 'number',
            example: 85,
          },
          maxScore: {
            type: 'number',
            example: 100,
          },
          percentage: {
            type: 'number',
            example: 85.0,
          },
          letterGrade: {
            type: 'string',
            enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
            example: 'B',
          },
          weight: {
            type: 'number',
            example: 1.0,
          },
          feedback: {
            type: 'string',
            example: 'Excellent work!',
          },
          gradedBy: {
            type: 'string',
            description: 'ObjectId reference to User',
            example: '507f1f77bcf86cd799439015',
          },
          gradedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:00:00Z',
          },
          term: {
            type: 'string',
            example: 'Fall 2024',
          },
          isPublished: {
            type: 'boolean',
            example: true,
          },
          notes: {
            type: 'string',
            example: 'Additional notes',
          },
        },
      },
      // Attendance Schema
      Attendance: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          class: {
            type: 'string',
            description: 'ObjectId reference to Class',
            example: '507f1f77bcf86cd799439012',
          },
          student: {
            type: 'string',
            description: 'ObjectId reference to User',
            example: '507f1f77bcf86cd799439013',
          },
          date: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T09:00:00Z',
          },
          status: {
            type: 'string',
            enum: ['present', 'absent', 'late', 'excused'],
            example: 'present',
          },
          markedBy: {
            type: 'string',
            description: 'ObjectId reference to User',
            example: '507f1f77bcf86cd799439014',
          },
          markedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T09:15:00Z',
          },
          notes: {
            type: 'string',
            example: 'Student arrived 5 minutes late',
          },
        },
      },
      // Request Body Schemas
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'profile'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'student@example.com',
          },
          password: {
            type: 'string',
            minLength: 8,
            example: 'SecurePass123!',
          },
          profile: {
            type: 'object',
            required: ['firstName', 'lastName'],
            properties: {
              firstName: {
                type: 'string',
                example: 'John',
              },
              lastName: {
                type: 'string',
                example: 'Doe',
              },
              phone: {
                type: 'string',
                example: '+1234567890',
              },
            },
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'teacher', 'coordinator', 'student'],
            default: 'student',
            example: 'student',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          password: {
            type: 'string',
            example: 'password123',
          },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            example: 'John',
          },
          lastName: {
            type: 'string',
            example: 'Doe',
          },
          phone: {
            type: 'string',
            example: '+1234567890',
          },
          dateOfBirth: {
            type: 'string',
            format: 'date',
            example: '2000-01-15',
          },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string', example: '123 Main St' },
              city: { type: 'string', example: 'New York' },
              state: { type: 'string', example: 'NY' },
              zipCode: { type: 'string', example: '10001' },
              country: { type: 'string', example: 'USA' },
            },
          },
        },
      },
      CreateCourseRequest: {
        type: 'object',
        required: ['name', 'description', 'teacher'],
        properties: {
          name: {
            type: 'string',
            example: 'Introduction to Mathematics',
          },
          description: {
            type: 'string',
            example: 'Comprehensive math course for grade 10',
          },
          code: {
            type: 'string',
            example: 'MATH101',
          },
          teacher: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          maxStudents: {
            type: 'number',
            example: 30,
          },
          schedule: {
            type: 'object',
            properties: {
              daysOfWeek: {
                type: 'array',
                items: { type: 'string' },
                example: ['monday', 'wednesday', 'friday'],
              },
              startTime: { type: 'string', example: '09:00' },
              endTime: { type: 'string', example: '10:30' },
              duration: { type: 'number', example: 90 },
            },
          },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'archived', 'completed'],
            example: 'draft',
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            example: '2024-02-01T00:00:00Z',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            example: '2024-06-30T23:59:59Z',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['mathematics', 'grade-10'],
          },
          prerequisites: {
            type: 'array',
            items: { type: 'string' },
            example: ['MATH100'],
          },
          syllabus: {
            type: 'string',
            example: 'Course syllabus content...',
          },
        },
      },
      EnrollStudentRequest: {
        type: 'object',
        required: ['studentId'],
        properties: {
          studentId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
        },
      },
      CreateAssignmentRequest: {
        type: 'object',
        required: ['title', 'description', 'course', 'dueDate', 'maxGrade'],
        properties: {
          title: {
            type: 'string',
            example: 'Homework 1: Algebra Basics',
          },
          description: {
            type: 'string',
            example: 'Complete exercises 1-10 from chapter 3',
          },
          course: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            example: '2024-12-31T23:59:59Z',
          },
          publishDate: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T00:00:00Z',
          },
          maxGrade: {
            type: 'number',
            example: 100,
          },
          attachments: {
            type: 'array',
            items: { type: 'string' },
            example: [],
          },
          instructions: {
            type: 'string',
            example: 'Submit your work as a PDF file',
          },
          allowLateSubmission: {
            type: 'boolean',
            example: false,
          },
          lateSubmissionPenalty: {
            type: 'number',
            example: 10,
          },
        },
      },
      SubmitAssignmentRequest: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            example: 'Assignment submission content...',
          },
          attachments: {
            type: 'array',
            items: { type: 'string' },
            example: [],
          },
        },
      },
      GradeSubmissionRequest: {
        type: 'object',
        required: ['grade'],
        properties: {
          grade: {
            type: 'number',
            example: 85,
          },
          feedback: {
            type: 'string',
            example: 'Good work! Minor improvements needed.',
          },
        },
      },
      MarkAttendanceRequest: {
        type: 'object',
        required: ['classId', 'studentId', 'date', 'status'],
        properties: {
          classId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          studentId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012',
          },
          date: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T09:00:00Z',
          },
          status: {
            type: 'string',
            enum: ['present', 'absent', 'late', 'excused'],
            example: 'present',
          },
          notes: {
            type: 'string',
            example: 'Student arrived 5 minutes late',
          },
        },
      },
      CreateNotificationRequest: {
        type: 'object',
        required: ['userId', 'type', 'category', 'title', 'message'],
        properties: {
          userId: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          type: {
            type: 'string',
            enum: ['email', 'in_app', 'both', 'sms'],
            example: 'in_app',
          },
          category: {
            type: 'string',
            enum: [
              'assignment_due',
              'assignment_graded',
              'grade_posted',
              'attendance_marked',
              'course_enrollment',
              'class_scheduled',
              'class_cancelled',
              'announcement',
              'system',
            ],
            example: 'assignment_due',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            example: 'medium',
          },
          title: {
            type: 'string',
            example: 'Assignment Due Tomorrow',
          },
          message: {
            type: 'string',
            example: 'Your assignment "Homework 1" is due tomorrow.',
          },
          metadata: {
            type: 'object',
            example: { assignmentId: '507f1f77bcf86cd799439011' },
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-12-31T23:59:59Z',
          },
        },
      },
      BulkImportUsersRequest: {
        type: 'object',
        required: ['users'],
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              required: ['email', 'password', 'role', 'profile'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 },
                role: {
                  type: 'string',
                  enum: ['admin', 'manager', 'teacher', 'coordinator', 'student'],
                },
                profile: {
                  type: 'object',
                  required: ['firstName', 'lastName'],
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phone: { type: 'string' },
                  },
                },
              },
            },
            maxItems: 100,
          },
        },
      },
      ApprovalRequest: {
        type: 'object',
        properties: {
          approvalNotes: {
            type: 'string',
            example: 'Approved after review',
          },
        },
      },
      // Response Schemas
      StandardResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully',
          },
          data: {
            type: 'object',
            description: 'Response data (varies by endpoint)',
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Authentication successful',
          },
          data: {
            type: 'object',
            properties: {
              user: {
                $ref: '#/components/schemas/User',
              },
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              user: {
                $ref: '#/components/schemas/User',
              },
            },
          },
        },
      },
      CourseResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              course: {
                $ref: '#/components/schemas/Course',
              },
            },
          },
        },
      },
      CourseListResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              courses: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Course',
                },
              },
              count: {
                type: 'number',
                example: 10,
              },
            },
          },
        },
      },
      AssignmentResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              assignment: {
                $ref: '#/components/schemas/Assignment',
              },
            },
          },
        },
      },
      GradeResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              grade: {
                $ref: '#/components/schemas/Grade',
              },
            },
          },
        },
      },
      AttendanceResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              attendance: {
                $ref: '#/components/schemas/Attendance',
              },
            },
          },
        },
      },
      DashboardResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              dashboard: {
                type: 'object',
                description: 'Dashboard data (varies by role)',
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'An error occurred',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'email',
                },
                message: {
                  type: 'string',
                  example: 'Email is required',
                },
              },
            },
          },
          stack: {
            type: 'string',
            description: 'Error stack trace (only in development)',
            example: 'Error: ...',
          },
        },
      },
      PaginationResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                description: 'Array of items',
              },
              count: {
                type: 'number',
                example: 10,
              },
              total: {
                type: 'number',
                example: 100,
              },
              page: {
                type: 'number',
                example: 1,
              },
              totalPages: {
                type: 'number',
                example: 10,
              },
            },
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Authentication and authorization endpoints',
    },
    {
      name: 'Courses',
      description: 'Course management endpoints',
    },
    {
      name: 'Classes',
      description: 'Class session management endpoints',
    },
    {
      name: 'Assignments',
      description: 'Assignment and homework management endpoints',
    },
    {
      name: 'Grades',
      description: 'Grading system endpoints',
    },
    {
      name: 'Attendance',
      description: 'Attendance tracking endpoints',
    },
    {
      name: 'Schedules',
      description: 'Scheduling and timetable endpoints',
    },
    {
      name: 'Notifications',
      description: 'Notification system endpoints',
    },
    {
      name: 'Reports',
      description: 'Reports and analytics endpoints',
    },
    {
      name: 'Admin',
      description: 'Admin dashboard endpoints (Admin only)',
    },
    {
      name: 'Manager',
      description: 'Manager dashboard endpoints (Manager, Admin)',
    },
    {
      name: 'Coordinator',
      description: 'Coordinator dashboard endpoints (Coordinator only)',
    },
    {
      name: 'Student',
      description: 'Student portal endpoints (Student only)',
    },
    {
      name: 'Leads',
      description: 'Lead management endpoints',
    },
    {
      name: 'FinalClass',
      description: 'Final class management endpoints',
    },
  ],
};

const options: any = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../controllers/*.ts'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
export { swaggerDefinition };

