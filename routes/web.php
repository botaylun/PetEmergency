<?php

use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\ClinicController;
use App\Http\Controllers\Api\v1\DoctorReviewController;
use App\Http\Controllers\Api\v1\EmergencyController;
use App\Http\Controllers\Api\v1\ForumController;
use App\Http\Controllers\Api\v1\PetController;
use App\Http\Middleware\AntiDdosSosMiddleware;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web & API Routes - PetEmergency & Care Monolith
|--------------------------------------------------------------------------
|
| Session-backed API routes for SPA Monolith Vue 3 with Axios.
|
*/

Route::prefix('api/v1')->group(function () {

    // ──────────────────────────────────────────────
    // Real Authentication Routes
    // ──────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/profile', [AuthController::class, 'updateProfile']);
    });

    // ──────────────────────────────────────────────
    // User Profile Media (Avatar / Cover)
    // ──────────────────────────────────────────────
    Route::prefix('me')->group(function () {
        Route::post('/avatar', [AuthController::class, 'uploadAvatar']);
        Route::post('/cover',  [AuthController::class, 'uploadCover']);
        Route::delete('/cover', [AuthController::class, 'deleteCover']);
    });

    // ──────────────────────────────────────────────
    // Public Users & Search
    // ──────────────────────────────────────────────
    Route::get('/search', [AuthController::class, 'unifiedSearch']);
    Route::prefix('users')->group(function () {
        Route::get('/search', [AuthController::class, 'searchUsers']);
        Route::get('/{id}',   [AuthController::class, 'publicProfile']);
    });

    // ──────────────────────────────────────────────
    // Doctor Ratings & Reviews
    // ──────────────────────────────────────────────
    Route::prefix('doctors/{doctorId}/reviews')->group(function () {
        Route::get('/',             [DoctorReviewController::class, 'index']);
        Route::post('/',            [DoctorReviewController::class, 'store']);
        Route::delete('/{id}',      [DoctorReviewController::class, 'destroy']);
        Route::post('/{id}/reply',  [DoctorReviewController::class, 'reply']);
        Route::post('/{id}/report', [DoctorReviewController::class, 'report']);
    });

    // ──────────────────────────────────────────────
    // Admin Management Routes
    // ──────────────────────────────────────────────
    Route::prefix('admin')->group(function () {
        Route::get('/doctors', [AuthController::class, 'adminGetDoctors']);
        Route::post('/doctors/{id}/verify', [AuthController::class, 'adminVerifyDoctor']);
    });

    // ──────────────────────────────────────────────
    // Pet CRUD & Health Management
    // ──────────────────────────────────────────────
    Route::prefix('pets')->group(function () {
        Route::get('/',    [PetController::class, 'index']);
        Route::post('/',   [PetController::class, 'store']);
        Route::get('/{id}',    [PetController::class, 'show']);
        Route::put('/{id}',    [PetController::class, 'update']);
        Route::delete('/{id}', [PetController::class, 'destroy']);

        // Health Events (vaccines, deworming, checkups)
        Route::get('/{petId}/health-events',          [PetController::class, 'indexHealthEvents']);
        Route::post('/{petId}/health-events',         [PetController::class, 'storeHealthEvent']);
        Route::put('/{petId}/health-events/{id}',     [PetController::class, 'updateHealthEvent']);
        Route::delete('/{petId}/health-events/{id}',  [PetController::class, 'deleteHealthEvent']);

        // Weight tracking
        Route::get('/{petId}/weights',          [PetController::class, 'indexWeights']);
        Route::post('/{petId}/weights',         [PetController::class, 'storeWeight']);
        Route::delete('/{petId}/weights/{id}',  [PetController::class, 'deleteWeight']);

        // Medications
        Route::get('/{petId}/medications',          [PetController::class, 'indexMedications']);
        Route::post('/{petId}/medications',         [PetController::class, 'storeMedication']);
        Route::delete('/{petId}/medications/{id}',  [PetController::class, 'deleteMedication']);

        // Public QR & Rescue
        Route::get('/qr/{token}',        [PetController::class, 'showPublicQr']);
        Route::post('/qr/{token}/found', [PetController::class, 'reportFound']);
    });
    // Legacy alias — keep GPS collar endpoints working
    Route::prefix('pet')->group(function () {
        Route::post('/pair-collar', [PetController::class, 'pairGpsCollar']);
        Route::post('/update-gps',  [PetController::class, 'updateGps']);
    });

    // ──────────────────────────────────────────────
    // Emergency SOS — On-demand Grab model
    // ──────────────────────────────────────────────
    Route::prefix('emergency')->group(function () {
        Route::get('/pending',           [EmergencyController::class, 'getPendingSos']);
        Route::get('/sos/{id}',          [EmergencyController::class, 'getSosDetail']);
        Route::get('/{id}/route',        [EmergencyController::class, 'getEmergencyRoute']);
        Route::get('/sos/{id}/route',    [EmergencyController::class, 'getEmergencyRoute']);
        Route::post('/sos',              [EmergencyController::class, 'createSos'])
             ->middleware(AntiDdosSosMiddleware::class);
        Route::post('/sos/{id}/accept',  [EmergencyController::class, 'acceptSos']);
        Route::post('/accept/{id}',      [EmergencyController::class, 'acceptSos']); // Alias for DoctorDashboard
        Route::post('/sos/{id}/status',  [EmergencyController::class, 'updateSosStatus']);
        Route::post('/sos/{id}/cancel',  [EmergencyController::class, 'cancelSos']);
        Route::post('/sos/{id}/complete',[EmergencyController::class, 'completeSos']);
        Route::post('/complete/{id}',    [EmergencyController::class, 'completeSos']);

        // Bác sĩ cập nhật vị trí real-time (heartbeat)
        Route::post('/doctor/location',  [EmergencyController::class, 'updateDoctorLocation']);
        Route::post('/doctor/offline',   [EmergencyController::class, 'doctorGoOffline']);
    });

    // ──────────────────────────────────────────────
    // Forum (Multimedia Feed)
    // ──────────────────────────────────────────────
    Route::prefix('forum')->group(function () {
        Route::get('/posts',                             [ForumController::class, 'index']);
        Route::get('/tags',                              [ForumController::class, 'getTags']);
        Route::post('/posts',                            [ForumController::class, 'createPost']);
        Route::put('/posts/{postId}',                    [ForumController::class, 'updatePost']);
        Route::delete('/posts/{postId}',                 [ForumController::class, 'deletePost']);
        Route::post('/posts/{postId}/comments',          [ForumController::class, 'addComment']);
        Route::post('/posts/{postId}/like',              [ForumController::class, 'toggleLike']);
        Route::post('/posts/{postId}/report',            [ForumController::class, 'reportPost']);
        // Admin only
        Route::get('/admin/reports',                     [ForumController::class, 'adminReports']);
        Route::post('/admin/reports/{reportId}/review',  [ForumController::class, 'adminReviewReport']);
    });

    // ──────────────────────────────────────────────
    // Vet Clinics Map (Public)
    // ──────────────────────────────────────────────
    Route::prefix('clinics')->group(function () {
        Route::get('/',                       [ClinicController::class, 'index']);
        Route::get('/{id}',                   [ClinicController::class, 'show']);
        Route::post('/{id}/report',           [ClinicController::class, 'reportClinic']);
        Route::post('/{id}/reviews',          [ClinicController::class, 'addReview']);
        Route::post('/{id}/join-request',     [ClinicController::class, 'joinRequest']);
    });

    // ──────────────────────────────────────────────
    // Doctor Clinic Management
    // ──────────────────────────────────────────────
    Route::prefix('doctor/clinics')->group(function () {
        Route::get('/',             [ClinicController::class, 'doctorIndex']);
        Route::post('/',            [ClinicController::class, 'doctorStore']);
        Route::put('/{id}',         [ClinicController::class, 'doctorUpdate']);
        Route::post('/{id}/submit', [ClinicController::class, 'doctorSubmit']);
    });

    // ──────────────────────────────────────────────
    // Geocoding Proxy (Nominatim)
    // ──────────────────────────────────────────────
    Route::prefix('geo')->group(function () {
        Route::get('/search',  [ClinicController::class, 'geoSearch']);
        Route::get('/reverse', [ClinicController::class, 'geoReverse']);
    });

    // ──────────────────────────────────────────────
    // Admin — Clinic Approval Queue
    // ──────────────────────────────────────────────
    Route::prefix('admin')->group(function () {
        Route::get('/doctors',                   [AuthController::class, 'adminGetDoctors']);
        Route::post('/doctors/{id}/verify',      [AuthController::class, 'adminVerifyDoctor']);
        Route::get('/clinics',                   [ClinicController::class, 'adminIndex']);
        Route::post('/clinics/{id}/approve',     [ClinicController::class, 'adminApprove']);
        Route::post('/clinics/{id}/reject',      [ClinicController::class, 'adminReject']);
        Route::post('/clinics/{id}/suspend',     [ClinicController::class, 'adminSuspend']);
    });
});
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
