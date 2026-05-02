import requests

url = "http://localhost:8000/api/predict/face/"

with open(r"C:\personality-prediction\backend\test_face.jpg", "rb") as f:
    response = requests.post(url, files={"face": ("test.jpg", f, "image/jpeg")})
    print(response.status_code)
    print(response.json())