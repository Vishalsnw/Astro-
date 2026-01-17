package com.astroguru.app

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.astroguru.app.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val viewModel: AstroViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        binding.btnSubmit.setOnClickListener {
            val name = binding.etName.text.toString()
            val dob = binding.etDob.text.toString()
            val tob = binding.etTob.text.toString()
            val pob = binding.etPob.text.toString()
            val question = binding.etQuestion.text.toString()

            if (name.isBlank() || dob.isBlank() || tob.isBlank() || pob.isBlank() || question.isBlank()) {
                Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val details = BirthDetails(name, dob, tob, pob, null)
            viewModel.getAstroGuidance(details, question)
        }
    }

    private fun observeViewModel() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                when (state) {
                    is AstroUiState.Idle -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSubmit.isEnabled = true
                    }
                    is AstroUiState.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                        binding.btnSubmit.isEnabled = false
                        binding.tvResult.text = "Consulting the stars..."
                    }
                    is AstroUiState.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSubmit.isEnabled = true
                        binding.tvResult.text = state.report
                    }
                    is AstroUiState.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSubmit.isEnabled = true
                        binding.tvResult.text = "Error: ${state.message}"
                        Toast.makeText(this@MainActivity, state.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }
}
