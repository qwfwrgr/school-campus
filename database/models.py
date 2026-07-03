"""校园端 — 数据表模型"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, func
)
from database.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    phone = Column(String(20), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(20), default="teacher")
    teacher_id = Column(String(20), unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class Class_(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    grade = Column(String(50), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    teacher_name = Column(String(50), default="")
    location = Column(String(100), default="")
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    class_ids = Column(String(200), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class CheckinCode(Base):
    __tablename__ = "checkin_codes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    course_name = Column(String(100), default="")
    code = Column(String(10), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())


class Checkin(Base):
    __tablename__ = "checkins"
    id = Column(Integer, primary_key=True, autoincrement=True)
    checkin_code_id = Column(Integer, ForeignKey("checkin_codes.id"), nullable=True)
    student_name = Column(String(50), nullable=False)
    student_id = Column(String(30), nullable=False)
    course_name = Column(String(100), default="")
    status = Column(String(20), default="正常")
    checkin_time = Column(DateTime, default=func.now())


class Homework(Base):
    __tablename__ = "homeworks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    course_name = Column(String(100), default="")
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    due_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    is_active = Column(Boolean, default=True)


class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    homework_id = Column(Integer, ForeignKey("homeworks.id"), nullable=False)
    student_name = Column(String(50), nullable=False)
    student_id = Column(String(30), nullable=False)
    content = Column(Text, default="")
    score = Column(Float, nullable=True)
    comment = Column(Text, default="")
    submitted_at = Column(DateTime, default=func.now())
    graded_at = Column(DateTime, nullable=True)


class Leave(Base):
    __tablename__ = "leaves"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_name = Column(String(50), nullable=False)
    student_id = Column(String(30), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    course_name = Column(String(100), default="")
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="待审批")
    created_at = Column(DateTime, default=func.now())
    approved_at = Column(DateTime, nullable=True)


class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, default="")
    scope = Column(String(20), default="全校")
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(30), nullable=False)
    student_name = Column(String(50), default="")
    title = Column(String(200), nullable=False)
    content = Column(Text, default="")
    notif_type = Column(String(30), default="system")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())


class StudentActivity(Base):
    __tablename__ = "student_activities"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_name = Column(String(50), nullable=False)
    student_id = Column(String(30), nullable=False)
    action_type = Column(String(30), nullable=False)
    content = Column(Text, default="")
    created_at = Column(DateTime, default=func.now())
