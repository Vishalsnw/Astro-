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
        Retrofit.Builder()
            .baseUrl("https://api.deepseek.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(DeepSeekApi::class.java)
    }

    private val apiKey = "Bearer sk-68be7759cb7746dbb0b90edba8e78fe0"

    fun getAstroGuidance(details: BirthDetails, question: String) {
        viewModelScope.launch {
            _uiState.value = AstroUiState.Loading
            try {
                val prompt = """
                    You are an experienced Vedic astrologer.
                    Analyze the kundli based on the following birth details:
                    Name: ${details.name}
                    DOB: ${details.dob}
                    Time: ${details.tob}
                    Place: ${details.pob}
                    Gender: ${details.gender ?: "Not specified"}
                    
                    User's Question: $question
                    
                    Provide the analysis in three clear sections:
                    1. 🔮 Kundli Overview (Personality, strengths, weaknesses)
                    2. 📊 Current Life Analysis (Directly addressing the user's question)
                    3. 🪔 Remedies & Solutions (Practical, behavioral, and spiritual guidance)
                    
                    Avoid fear-based language and keep the tone professional and calming.
                """.trimIndent()

                val request = DeepSeekRequest(
                    messages = listOf(
                        Message(role = "system", content = "You are a professional Vedic astrologer."),
                        Message(role = "user", content = prompt)
                    )
                )

                val response = api.getCompletion(apiKey, request)
                val report = response.choices.firstOrNull()?.message?.content ?: "No analysis generated."
                _uiState.value = AstroUiState.Success(report)
            } catch (e: Exception) {
                _uiState.value = AstroUiState.Error(e.message ?: "Failed to connect to astro service")
            }
        }
    }
}

sealed class AstroUiState {
    object Idle : AstroUiState()
    object Loading : AstroUiState()
    data class Success(val report: String) : AstroUiState()
    data class Error(val message: String) : AstroUiState()
}

data class BirthDetails(
    val name: String,
    val dob: String,
    val tob: String,
    val pob: String,
    val gender: String?
)
