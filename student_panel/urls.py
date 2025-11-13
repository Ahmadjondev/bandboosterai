from django.urls import path
from . import views

app_name = "student"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("join/", views.join_exam, name="join_exam"),
    path("exams/", views.exam_list, name="exam_list"),
    path("exams/<int:exam_id>/", views.exam_detail, name="exam_detail"),
    path("exams/<int:exam_id>/start/", views.start_exam, name="start_exam"),
    path("profile/", views.profile, name="profile"),
    path("profile/change-password/", views.change_password, name="change_password"),
    # path("results/", views.my_results, name="my_results"),
    # path("results/<int:result_id>/", views.result_detail, name="result_detail"),
]
