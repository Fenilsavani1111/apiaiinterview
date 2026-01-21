const { Op } = require('sequelize');
const { StudentsWithJobPost } = require('../models');

const studentController = {
  // ============================================
  // CREATE MULTIPLE STUDENTS (FROM EXCEL UPLOAD)
  // ============================================
  createStudents: async (req, res) => {
    try {
      const { students, jobPostId } = req.body;

      console.log('📝 CREATE STUDENTS REQUEST:', {
        jobPostId,
        studentCount: students?.length
      });

      if (!jobPostId) {
        return res.status(400).json({
          success: false,
          message: 'Job Post ID is required',
        });
      }

      if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Students array is required and must not be empty',
        });
      }

      // Validate each student
      const errors = [];
      students.forEach((student, index) => {
        if (!student.name) errors.push(`Student ${index + 1}: name is required`);
        if (!student.email) errors.push(`Student ${index + 1}: email is required`);
        if (!student.phoneNumber) errors.push(`Student ${index + 1}: phoneNumber is required`);
      });

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors
        });
      }

      // Check for duplicate emails in the same job post
      const existingStudents = await StudentsWithJobPost.findAll({
        where: {
          jobPostId: jobPostId,
          email: {
            [Op.in]: students.map(s => s.email.toLowerCase())
          }
        }
      });

      if (existingStudents.length > 0) {
        const duplicateEmails = existingStudents.map(s => s.email);
        return res.status(409).json({
          success: false,
          message: 'Some students already exist for this job post',
          duplicateEmails: duplicateEmails
        });
      }

      // Create students using ONLY existing database columns
      const studentsToCreate = students.map(student => ({
        name: student.name,
        email: student.email.toLowerCase(),
        mobile: student.phoneNumber, // Store phone in 'mobile' column
        jobPostId: jobPostId,
        status: 'scheduled',
        appliedDate: new Date()
      }));

      const createdStudents = await StudentsWithJobPost.bulkCreate(studentsToCreate);

      console.log('✅ Students created successfully:', createdStudents.length);

      return res.status(201).json({
        success: true,
        message: `${createdStudents.length} students added successfully`,
        count: createdStudents.length,
        students: createdStudents
      });
    } catch (error) {
      console.error('❌ Create students error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error creating students',
        error: error.message,
      });
    }
  },

  // ============================================
  // GET ALL STUDENTS FOR A JOB POST
  // ============================================
  getStudentsByJobPost: async (req, res) => {
    try {
      const { jobPostId } = req.params;

      console.log('📊 GET STUDENTS REQUEST:', { jobPostId });

      const students = await StudentsWithJobPost.findAll({
        where: {
          jobPostId: jobPostId
        },
        order: [['createdAt', 'DESC']],
        attributes: [
          'id',
          'name',
          'email',
          'mobile',
          'jobPostId',
          'status',
          'appliedDate',
          'createdAt'
        ]
      });

      // Transform mobile to phoneNumber for frontend
      const transformedStudents = students.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phoneNumber: s.mobile, // Map mobile to phoneNumber
        mobile: s.mobile,
        jobPostId: s.jobPostId,
        status: s.status,
        createdAt: s.createdAt
      }));

      return res.status(200).json({
        success: true,
        count: transformedStudents.length,
        students: transformedStudents
      });
    } catch (error) {
      console.error('❌ Get students error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching students',
        error: error.message,
      });
    }
  },

  // ============================================
  // DELETE ALL STUDENTS FOR A JOB POST
  // ============================================
  deleteStudentsByJobPost: async (req, res) => {
    try {
      const { jobPostId } = req.params;

      console.log('🗑️ DELETE STUDENTS REQUEST:', { jobPostId });

      // Delete all students for this job post
      const deletedCount = await StudentsWithJobPost.destroy({
        where: {
          jobPostId: jobPostId
        }
      });

      return res.status(200).json({
        success: true,
        message: `${deletedCount} students deleted successfully`,
        deletedCount: deletedCount
      });
    } catch (error) {
      console.error('❌ Delete students error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error deleting students',
        error: error.message,
      });
    }
  },

  // ============================================
  // DELETE A SINGLE STUDENT
  // ============================================
  deleteStudent: async (req, res) => {
    try {
      const { id } = req.params;

      console.log('🗑️ DELETE STUDENT REQUEST:', { id });

      const student = await StudentsWithJobPost.findByPk(id);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      await student.destroy();

      return res.status(200).json({
        success: true,
        message: 'Student deleted successfully',
      });
    } catch (error) {
      console.error('❌ Delete student error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error deleting student',
        error: error.message,
      });
    }
  },

  // ============================================
  // UPDATE/REPLACE STUDENTS FOR A JOB POST
  // ============================================
  updateStudents: async (req, res) => {
    try {
      const { jobPostId } = req.params;
      const { students } = req.body;

      console.log('🔄 UPDATE STUDENTS REQUEST:', {
        jobPostId,
        studentCount: students?.length
      });

      if (!students || !Array.isArray(students)) {
        return res.status(400).json({
          success: false,
          message: 'Students array is required',
        });
      }

      // Delete existing students for this job
      await StudentsWithJobPost.destroy({
        where: {
          jobPostId: jobPostId
        }
      });

      if (students.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'All students removed successfully',
          count: 0,
          students: []
        });
      }

      // Create new students
      const studentsToCreate = students.map(student => ({
        name: student.name,
        email: student.email.toLowerCase(),
        mobile: student.phoneNumber,
        jobPostId: jobPostId,
        status: 'scheduled',
        appliedDate: new Date()
      }));

      const createdStudents = await StudentsWithJobPost.bulkCreate(studentsToCreate);

      console.log('✅ Students updated successfully:', createdStudents.length);

      // Transform response
      const transformedStudents = createdStudents.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phoneNumber: s.mobile,
        mobile: s.mobile,
        jobPostId: s.jobPostId,
        status: s.status,
        createdAt: s.createdAt
      }));

      return res.status(200).json({
        success: true,
        message: `${transformedStudents.length} students updated successfully`,
        count: transformedStudents.length,
        students: transformedStudents
      });
    } catch (error) {
      console.error('❌ Update students error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error updating students',
        error: error.message,
      });
    }
  },

  // ============================================
  // GET STUDENT COUNT FOR A JOB POST
  // ============================================
  getStudentCount: async (req, res) => {
    try {
      const { jobPostId } = req.params;

      const count = await StudentsWithJobPost.count({
        where: {
          jobPostId: jobPostId
        }
      });

      return res.status(200).json({
        success: true,
        jobPostId: jobPostId,
        count: count
      });
    } catch (error) {
      console.error('❌ Get student count error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error fetching student count',
        error: error.message,
      });
    }
  },
};

module.exports = studentController;