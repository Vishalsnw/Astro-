package com.astroguru.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class AstroViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<AstroUiState>(AstroUiState.Idle)
    val uiState: StateFlow<AstroUiState> = _uiState

    private val api: DeepSeekApi by lazy {
        val okHttpClient = okhttp3.OkHttpClient.Builder()
            .connectTimeout(120, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(120, java.util.concurrent.TimeUnit.SECONDS)
            .writeTimeout(120, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        Retrofit.Builder()
            .baseUrl("https://f811d2a7-7d2a-4cb5-9eaf-47bce0643765-00-1gylsycuzzpfn.sisko.replit.dev/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(DeepSeekApi::class.java)
    }

    fun getAstroGuidance(details: BirthDetails, question: String, language: String = "English") {
        viewModelScope.launch {
            _uiState.value = AstroUiState.Loading
            try {
                val request = AstrologyRequest(
                    name = details.name,
                    dob = details.dob,
                    time = details.time,
                    place = details.place,
                    gender = details.gender ?: "Not specified",
                    question = question,
                    language = language
                )

                val response = api.getAstroAnalysis(request)
                _uiState.value = AstroUiState.Success(response.result, response.pdf)
            } catch (e: Exception) {
                _uiState.value = AstroUiState.Error(e.message ?: "Failed to connect to astro service")
            }
        }
    }
}

sealed class AstroUiState {
    object Idle : AstroUiState()
    object Loading : AstroUiState()
    data class Success(val report: String, val pdf: String? = null) : AstroUiState()
    data class Error(val message: String) : AstroUiState()
}

data class BirthDetails(
    val name: String,
    val dob: String,
    val time: String,
    val place: String,
    val gender: String?
)
