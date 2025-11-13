from django.urls import path, include, re_path
from . import views

app_name = "manager"

urlpatterns = [
    path("api/", include("manager_panel.api_urls")),
    path("", views.spa_view, name="spa"),
    re_path(r"^(?P<path>.*)/$", views.spa_view, name="spa_catchall"),
]
