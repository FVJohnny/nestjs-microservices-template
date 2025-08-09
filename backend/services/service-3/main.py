from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"service": "service-3", "status": "ok"}
