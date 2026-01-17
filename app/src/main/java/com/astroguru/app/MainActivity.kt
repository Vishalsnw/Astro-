package com.astroguru.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.astroguru.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Form logic will go here
    }
}
