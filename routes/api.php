<?php

use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\EmergencyController;
use App\Http\Controllers\Api\v1\ForumController;
use App\Http\Controllers\Api\v1\PetController;
use App\Http\Middleware\AntiDdosSosMiddleware;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — PetEmergency v1
| Đây là file phụ, routes chính ở web.php để dùng session auth
|--------------------------------------------------------------------------
*/

// File này để trống hoặc chỉ dùng cho webhook không cần auth
// Routes thực ở routes/web.php với prefix api/v1
