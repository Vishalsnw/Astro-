package com.astroguru.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AstroViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<AstroUiState>(AstroUiState.Idle)
    val uiState: StateFlow<AstroUiState> = _uiState

    fun getAstroGuidance(details: BirthDetails, question: String) {
        viewModelScope.launch {
            _uiState.value = AstroUiState.Loading
            try {
                // API call logic here
                _uiState.value = AstroUiState.Success("Your kundli analysis...")
            } catch (e: Exception) {
                _uiState.value = AstroUiState.Error(e.message ?: "Unknown error")
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
