from django.urls import path
from .views import (
    predict_personality, 
    predict_face_only, 
    predict_voice_only,
    predict_multimodal,
    health_check,
    submit_feedback,
)
from .auth_views import (
    register,
    login,
    get_current_user,
    save_test_result,
    get_user_results,
    admin_get_all_users,
    admin_get_user_details,
)

urlpatterns = [
    # Main prediction endpoints
    path('predict/', predict_personality, name='predict_personality'),
    path('predict/text/', predict_personality, name='predict_text'),
    path('predict/multimodal/', predict_multimodal, name='predict_multimodal'),
    path('predict/face/', predict_face_only, name='predict_face'),
    path('predict/voice/', predict_voice_only, name='predict_voice'),
    
    # Feedback endpoint
    path('feedback/', submit_feedback, name='submit_feedback'),
    
    # Authentication endpoints
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/me/', get_current_user, name='get_current_user'),
    
    # Test results endpoints
    path('results/save/', save_test_result, name='save_test_result'),
    path('results/', get_user_results, name='get_user_results'),
    
    # Admin endpoints
    path('admin/users/', admin_get_all_users, name='admin_get_all_users'),
    path('admin/users/<int:user_id>/', admin_get_user_details, name='admin_get_user_details'),
    
    # Utility endpoints
    path('health/', health_check, name='health_check'),
]