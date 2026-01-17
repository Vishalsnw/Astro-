package com.astroguru.app

import retrofit2.http.Body
import retrofit2.http.POST

interface DeepSeekApi {
    @POST("api/astrology")
    suspend fun getAstroAnalysis(
        @Body request: AstrologyRequest
    ): AstrologyResponse
}

data class AstrologyRequest(
    val name: String,
    val dob: String,
    val time: String,
    val place: String,
    val gender: String,
    val question: String
)

data class AstrologyResponse(
    val result: String,
    val pdf: String? = null
)
