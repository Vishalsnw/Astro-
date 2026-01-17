package com.astroguru.app

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.astroguru.app.databinding.ActivityMainBinding
import kotlinx.coroutines.launch
import java.util.*

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val viewModel: AstroViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
        observeViewModel()
        checkProStatus()
    }

    private fun setupListeners() {
        binding.etDob.setOnClickListener { showDatePicker() }
        binding.etTob.setOnClickListener { showTimePicker() }
        binding.tvUpgradePro.setOnClickListener { upgradeToPro() }

        binding.btnSubmit.setOnClickListener {
            if (!canMakeRequest()) {
                showUpgradeDialog()
                return@setOnClickListener
            }

            val name = binding.etName.text.toString().trim()
            val dob = binding.etDob.text.toString().trim()
            val tob = binding.etTob.text.toString().trim()
            val pob = binding.etPob.text.toString().trim()
            val question = binding.etQuestion.text.toString().trim()

            if (name.isBlank() || dob.isBlank() || tob.isBlank() || pob.isBlank() || question.isBlank()) {
                Toast.makeText(this, "Please fill all details to consult the stars", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val selectedLanguage = if (binding.toggleLanguage.checkedButtonId == binding.btnHindi.id) "Hindi" else "English"
            val details = BirthDetails(name, dob, tob, pob, null)
            viewModel.getAstroGuidance(details, question, selectedLanguage)
            recordRequest()
        }
    }

    private fun showUpgradeDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Daily Limit Reached")
            .setMessage("Free users can ask 1 question per day. Upgrade to Pro for unlimited guidance and detailed remedies!")
            .setPositiveButton("Upgrade Now") { _, _ -> upgradeToPro() }
            .setNegativeButton("Maybe Later", null)
            .show()
    }

    private fun upgradeToPro() {
        val prefs = getSharedPreferences("astro_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("is_pro", true).apply()
        checkProStatus()
        Toast.makeText(this, "Welcome to Astro Guru Pro!", Toast.LENGTH_SHORT).show()
    }

    private fun checkProStatus() {
        val isPro = getSharedPreferences("astro_prefs", Context.MODE_PRIVATE).getBoolean("is_pro", false)
        binding.tvUpgradePro.visibility = if (isPro) View.GONE else View.VISIBLE
    }

    private fun canMakeRequest(): Boolean {
        val prefs = getSharedPreferences("astro_prefs", Context.MODE_PRIVATE)
        val isPro = prefs.getBoolean("is_pro", false)
        if (isPro) return true

        val lastRequestDate = prefs.getString("last_request_date", "")
        val today = String.format("%tD", Date())
        return lastRequestDate != today
    }

    private fun recordRequest() {
        val prefs = getSharedPreferences("astro_prefs", Context.MODE_PRIVATE)
        val today = String.format("%tD", Date())
        prefs.edit().putString("last_request_date", today).apply()
    }

    private fun showDatePicker() {
        val calendar = Calendar.getInstance()
        DatePickerDialog(this, { _, year, month, dayOfMonth ->
            binding.etDob.setText(String.format("%02d/%02d/%d", dayOfMonth, month + 1, year))
        }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).show()
    }

    private fun showTimePicker() {
        val calendar = Calendar.getInstance()
        TimePickerDialog(this, { _, hourOfDay, minute ->
            binding.etTob.setText(String.format("%02d:%02d", hourOfDay, minute))
        }, calendar.get(Calendar.HOUR_OF_DAY), calendar.get(Calendar.MINUTE), true).show()
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
                        binding.btnSubmit.alpha = 0.7f
                        binding.resultCard.visibility = View.VISIBLE
                        binding.tvResult.text = "Consulting the stars..."
                    }
                    is AstroUiState.Success -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSubmit.isEnabled = true
                        binding.btnSubmit.alpha = 1.0f
                        binding.resultCard.visibility = View.VISIBLE
                        binding.resultCard.alpha = 0f
                        binding.resultCard.animate().alpha(1f).setDuration(500).start()
                        formatReport(state.report)
                    }
                    is AstroUiState.Error -> {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSubmit.isEnabled = true
                        binding.btnSubmit.alpha = 1.0f
                        binding.tvResult.text = "Error: ${state.message}"
                        Toast.makeText(this@MainActivity, state.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }

    private fun formatReport(report: String) {
        // Simple bolding for section headers
        val formatted = report
            .replace("🔮 Kundli Overview", "<b>🔮 Kundli Overview</b>")
            .replace("📊 Current Life Analysis", "<b>📊 Current Life Analysis</b>")
            .replace("🪔 Remedies & Solutions", "<b>🪔 Remedies & Solutions</b>")
            .replace("\n", "<br/>")
        
        binding.tvResult.text = android.text.Html.fromHtml(formatted, android.text.Html.FROM_HTML_MODE_COMPACT)
    }
}
