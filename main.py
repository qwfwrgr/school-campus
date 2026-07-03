"""🏫 校园端 — FastAPI 入口"""
import os, sys, json, hashlib, random, logging
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

sys.path.insert(0, os.path.dirname(__file__))
from database.database import init_db, SessionLocal
from database.models import *

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()

def gen_checkin_code() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(6))

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🏫 校园端启动中...")
    init_db()
    logger.info("✅ 数据库初始化完成")
    yield
    logger.info("👋 校园端关闭")

app = FastAPI(title="校园端管理后台", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ─── Static Files ───
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ─── Auth ───
@app.post("/api/register")
async def register(req: Request):
    data = await req.json()
    name, phone, password = data.get("name"), data.get("phone"), data.get("password")
    if not all([name, phone, password]):
        return JSONResponse({"status": "error", "msg": "请填写完整信息"}, status_code=400)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.phone == phone).first()
        if existing:
            return JSONResponse({"status": "error", "msg": "手机号已注册"}, status_code=400)
        teacher_id = f"T{datetime.now().strftime('%Y%m%d')}{random.randint(100,999)}"
        user = User(name=name, phone=phone, password_hash=hash_password(password), teacher_id=teacher_id)
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"status": "success", "msg": "注册成功", "data": {"name": name, "teacher_id": teacher_id}}
    finally:
        db.close()

@app.post("/api/login")
async def login(req: Request):
    data = await req.json()
    account, password = data.get("account"), data.get("password")
    if not account or not password:
        return JSONResponse({"status": "error", "msg": "请输入账号和密码"}, status_code=400)
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            (User.phone == account) | (User.teacher_id == account)
        ).first()
        if not user or user.password_hash != hash_password(password):
            return JSONResponse({"status": "error", "msg": "账号或密码错误"}, status_code=401)
        token = hashlib.sha256(f"{user.id}:{user.phone}:{datetime.now().isoformat()}".encode()).hexdigest()[:32]
        return {"status": "success", "msg": "登录成功", "data": {
            "token": token, "name": user.name, "teacher_id": user.teacher_id, "phone": user.phone
        }}
    finally:
        db.close()

# ─── Teacher Info ───
@app.get("/api/teacher/info")
async def teacher_info(teacher_id: str = ""):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.teacher_id == teacher_id).first()
        if not user:
            return JSONResponse({"status": "error", "msg": "教师不存在"}, status_code=404)
        return {"status": "success", "data": {"name": user.name, "teacher_id": user.teacher_id, "phone": user.phone}}
    finally:
        db.close()

# ─── Classes ───
@app.get("/api/classes")
async def get_classes():
    db = SessionLocal()
    try:
        classes = db.query(Class_).filter(Class_.is_active == True).all()
        return {"status": "success", "data": [{"id": c.id, "name": c.name, "grade": c.grade} for c in classes]}
    finally:
        db.close()

@app.post("/api/classes")
async def create_class(req: Request):
    data = await req.json()
    name, grade = data.get("name"), data.get("grade", "")
    if not name:
        return JSONResponse({"status": "error", "msg": "请输入班级名称"}, status_code=400)
    db = SessionLocal()
    try:
        c = Class_(name=name, grade=grade)
        db.add(c)
        db.commit()
        return {"status": "success", "msg": f"班级「{name}」创建成功", "data": {"id": c.id}}
    finally:
        db.close()

@app.delete("/api/classes/{class_id}")
async def delete_class(class_id: int):
    db = SessionLocal()
    try:
        c = db.query(Class_).filter(Class_.id == class_id).first()
        if not c:
            return JSONResponse({"status": "error", "msg": "班级不存在"}, status_code=404)
        c.is_active = False
        db.commit()
        return {"status": "success", "msg": f"班级「{c.name}」已删除"}
    finally:
        db.close()

# ─── Courses ───
@app.get("/api/courses")
async def get_courses():
    db = SessionLocal()
    try:
        courses = db.query(Course).filter(Course.is_active == True).order_by(Course.day_of_week, Course.start_time).all()
        days = ["周一","周二","周三","周四","周五","周六","周日"]
        return {"status": "success", "data": [{
            "id": c.id, "name": c.name, "teacher_name": c.teacher_name,
            "location": c.location, "day_of_week": c.day_of_week,
            "day_label": days[c.day_of_week-1] if 1 <= c.day_of_week <= 7 else "",
            "start_time": c.start_time, "end_time": c.end_time, "class_ids": c.class_ids
        } for c in courses]}
    finally:
        db.close()

@app.post("/api/courses")
async def create_course(req: Request):
    data = await req.json()
    name = data.get("name")
    if not name:
        return JSONResponse({"status": "error", "msg": "请输入课程名称"}, status_code=400)
    db = SessionLocal()
    try:
        course = Course(
            name=name, teacher_name=data.get("teacher_name", ""),
            location=data.get("location", ""), day_of_week=data.get("day_of_week", 1),
            start_time=data.get("start_time", "08:00"), end_time=data.get("end_time", "09:40"),
            class_ids=data.get("class_ids", "")
        )
        db.add(course)
        db.commit()
        return {"status": "success", "msg": f"课程「{name}」创建成功"}
    finally:
        db.close()

@app.delete("/api/courses/{course_id}")
async def delete_course(course_id: int):
    db = SessionLocal()
    try:
        c = db.query(Course).filter(Course.id == course_id).first()
        if not c:
            return JSONResponse({"status": "error", "msg": "课程不存在"}, status_code=404)
        c.is_active = False
        db.commit()
        return {"status": "success", "msg": f"课程「{c.name}」已删除"}
    finally:
        db.close()

# ─── Checkin ───
@app.post("/api/checkin/start")
async def start_checkin(req: Request):
    data = await req.json()
    course_id = data.get("course_id")
    if not course_id:
        return JSONResponse({"status": "error", "msg": "请选择课程"}, status_code=400)
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return JSONResponse({"status": "error", "msg": "课程不存在"}, status_code=404)
        code = gen_checkin_code()
        cc = CheckinCode(course_id=course_id, course_name=course.name, code=code,
                         expires_at=datetime.now() + timedelta(minutes=10))
        db.add(cc)
        db.commit()
        return {"status": "success", "msg": f"签到已发起！签到码: {code}", "data": {"code": code, "course_name": course.name}}
    finally:
        db.close()

@app.get("/api/checkin/records")
async def get_checkin_records():
    db = SessionLocal()
    try:
        records = db.query(Checkin).order_by(Checkin.checkin_time.desc()).limit(100).all()
        return {"status": "success", "data": [{
            "id": r.id, "student_name": r.student_name, "student_id": r.student_id,
            "course_name": r.course_name, "status": r.status,
            "time": r.checkin_time.strftime("%m-%d %H:%M")
        } for r in records]}
    finally:
        db.close()

# ─── Homework ───
@app.post("/api/homeworks")
async def create_homework(req: Request):
    data = await req.json()
    title, course_id = data.get("title"), data.get("course_id")
    if not title or not course_id:
        return JSONResponse({"status": "error", "msg": "请填写作业标题和课程"}, status_code=400)
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        hw = Homework(title=title, course_id=course_id, course_name=course.name if course else "",
                       description=data.get("description", ""),
                       due_at=datetime.fromisoformat(data["due_at"]) if data.get("due_at") else None)
        db.add(hw)
        db.commit()
        return {"status": "success", "msg": f"作业「{title}」已发布"}
    finally:
        db.close()

@app.get("/api/homeworks")
async def get_homeworks():
    db = SessionLocal()
    try:
        hws = db.query(Homework).filter(Homework.is_active == True).order_by(Homework.created_at.desc()).all()
        return {"status": "success", "data": [{
            "id": h.id, "title": h.title, "course_name": h.course_name,
            "description": h.description[:100] if h.description else "",
            "due_at": h.due_at.strftime("%m-%d %H:%M") if h.due_at else "无截止",
            "submissions": db.query(Submission).filter(Submission.homework_id == h.id).count()
        } for h in hws]}
    finally:
        db.close()

@app.get("/api/homeworks/{homework_id}/submissions")
async def get_submissions(homework_id: int):
    db = SessionLocal()
    try:
        subs = db.query(Submission).filter(Submission.homework_id == homework_id).order_by(Submission.submitted_at.desc()).all()
        return {"status": "success", "data": [{
            "id": s.id, "student_name": s.student_name, "student_id": s.student_id,
            "content": s.content[:200], "score": s.score, "comment": s.comment,
            "submitted_at": s.submitted_at.strftime("%m-%d %H:%M"), "graded": s.score is not None
        } for s in subs]}
    finally:
        db.close()

@app.post("/api/homeworks/{homework_id}/grade")
async def grade_submission(homework_id: int, req: Request):
    data = await req.json()
    sub_id, score, comment = data.get("sub_id"), data.get("score"), data.get("comment", "")
    if not sub_id or score is None:
        return JSONResponse({"status": "error", "msg": "请填写评分"}, status_code=400)
    db = SessionLocal()
    try:
        sub = db.query(Submission).filter(Submission.id == sub_id, Submission.homework_id == homework_id).first()
        if not sub:
            return JSONResponse({"status": "error", "msg": "提交记录不存在"}, status_code=404)
        sub.score = float(score)
        sub.comment = comment
        sub.graded_at = datetime.now()
        db.commit()
        return {"status": "success", "msg": f"已评分 {sub.student_name}: {score}分"}
    finally:
        db.close()

# ─── Leaves ───
@app.get("/api/leaves")
async def get_leaves():
    db = SessionLocal()
    try:
        leaves = db.query(Leave).order_by(Leave.created_at.desc()).all()
        return {"status": "success", "data": [{
            "id": l.id, "student_name": l.student_name, "student_id": l.student_id,
            "course_name": l.course_name, "reason": l.reason, "status": l.status,
            "time": l.created_at.strftime("%m-%d %H:%M")
        } for l in leaves]}
    finally:
        db.close()

@app.post("/api/leaves/{leave_id}/approve")
async def approve_leave(leave_id: int, req: Request):
    data = await req.json()
    db = SessionLocal()
    try:
        leave = db.query(Leave).filter(Leave.id == leave_id).first()
        if not leave:
            return JSONResponse({"status": "error", "msg": "请假记录不存在"}, status_code=404)
        leave.status = data.get("status", "已批准")
        leave.approved_at = datetime.now()
        db.commit()
        return {"status": "success", "msg": f"请假已{leave.status}"}
    finally:
        db.close()

# ─── Announcements ───
@app.post("/api/announcements")
async def create_announcement(req: Request):
    data = await req.json()
    title, content = data.get("title"), data.get("content")
    if not title:
        return JSONResponse({"status": "error", "msg": "请输入公告标题"}, status_code=400)
    db = SessionLocal()
    try:
        ann = Announcement(title=title, content=content or "",
                           scope=data.get("scope", "全校"), class_id=data.get("class_id"))
        db.add(ann)
        db.commit()
        return {"status": "success", "msg": f"公告「{title}」已发布"}
    finally:
        db.close()

@app.get("/api/announcements")
async def get_announcements():
    db = SessionLocal()
    try:
        anns = db.query(Announcement).order_by(Announcement.created_at.desc()).limit(50).all()
        return {"status": "success", "data": [{
            "id": a.id, "title": a.title, "content": a.content[:200],
            "scope": a.scope, "time": a.created_at.strftime("%m-%d %H:%M")
        } for a in anns]}
    finally:
        db.close()

# ─── Student Activities (Toast feed) ───
@app.get("/api/activities")
async def get_activities(since_id: int = 0):
    db = SessionLocal()
    try:
        acts = db.query(StudentActivity).filter(StudentActivity.id > since_id).order_by(StudentActivity.id.desc()).limit(20).all()
        acts.reverse()
        return {"status": "success", "data": [{
            "id": a.id, "student_name": a.student_name,
            "action_type": a.action_type, "content": a.content,
            "time": a.created_at.strftime("%H:%M:%S")
        } for a in acts], "latest_id": max([a.id for a in acts], default=since_id)}
    finally:
        db.close()

# ─── Dashboard Stats ───
@app.get("/api/dashboard")
async def dashboard():
    db = SessionLocal()
    try:
        student_count = random.randint(80, 150)
        course_count = db.query(Course).filter(Course.is_active == True).count()
        today_checkins = db.query(Checkin).filter(
            func.date(Checkin.checkin_time) == func.date("now")
        ).count()
        pending_leaves = db.query(Leave).filter(Leave.status == "待审批").count()
        return {"status": "success", "data": {
            "student_count": student_count,
            "course_count": course_count,
            "today_checkins": today_checkins,
            "pending_leaves": pending_leaves
        }}
    finally:
        db.close()

# ─── Students ───
@app.get("/api/students")
async def get_students():
    db = SessionLocal()
    try:
        # 返回模拟学生数据
        names = ["张三","李四","王五","赵六","钱七","孙八","周九","吴十","郑十一","冯十二"]
        students = []
        for i in range(1, 31):
            name = names[i % len(names)]
            if i > len(names):
                name = f"学生{i}"
            students.append({
                "student_id": f"2024{i:04d}",
                "name": f"{name}",
                "phone": f"138{i:08d}",
                "class_name": f"计算机科学与技术({(i%3)+1})班"
            })
        return {"status": "success", "data": students}
    finally:
        db.close()

# ─── Health ───
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "校园端管理后台", "version": "1.0.0"}


# ─── Serve Frontend ───
@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.get("/pages/{page}")
async def serve_page(page: str):
    path = os.path.join(static_dir, "pages", page)
    if os.path.exists(path):
        return FileResponse(path)
    return FileResponse(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
