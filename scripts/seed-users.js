#!/usr/bin/env node
// seed-users.js
// Script to seed users using the Supabase API

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function seedUsers() {
  try {
    console.log('Creating test users...');
    
    // Check if user1 exists
    const { data: existingUser1 } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', 'user1@example.com')
      .maybeSingle();
    
    let user1Id;
    
    if (existingUser1) {
      console.log('User1 already exists, skipping creation');
      user1Id = existingUser1.id;
    } else {
      // Create user1
      const { data: user1, error: error1 } = await supabaseAdmin.auth.admin.createUser({
        email: 'user1@example.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          full_name: 'Test User 1',
        },
      });
      
      if (error1) {
        console.error('Error creating user1:', error1.message);
      } else {
        console.log('User1 created successfully:', user1.user.id);
        user1Id = user1.user.id;
      }
    }
    
    if (user1Id) {
      // Insert sample decks for user1
      await createDecksForUser(user1Id, [
        { name: 'JavaScript Fundamentals', description: 'Core concepts of JavaScript programming' },
        { name: 'React Hooks', description: 'All about React hooks and their usage' },
        { name: 'CSS Grid & Flexbox', description: 'Modern CSS layout techniques' }
      ]);
    }
    
    // Check if user2 exists
    const { data: existingUser2 } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', 'user2@example.com')
      .maybeSingle();
    
    let user2Id;
    
    if (existingUser2) {
      console.log('User2 already exists, skipping creation');
      user2Id = existingUser2.id;
    } else {
      // Create user2
      const { data: user2, error: error2 } = await supabaseAdmin.auth.admin.createUser({
        email: 'user2@example.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          full_name: 'Test User 2',
        },
      });
      
      if (error2) {
        console.error('Error creating user2:', error2.message);
      } else {
        console.log('User2 created successfully:', user2.user.id);
        user2Id = user2.user.id;
      }
    }
    
    if (user2Id) {
      // Insert sample decks for user2
      await createDecksForUser(user2Id, [
        { name: 'TypeScript Basics', description: 'Introduction to TypeScript' },
        { name: 'SQL Queries', description: 'Common SQL queries and patterns' },
        { name: 'Git Commands', description: 'Essential Git commands for daily use' }
      ]);
    }
    
    console.log('Seeding completed!');
  } catch (error) {
    console.error('Error seeding users:', error.message);
  }
}

async function createDecksForUser(userId, decks) {
  for (const deck of decks) {
    const { data, error } = await supabaseAdmin
      .from('decks')
      .insert({
        user_id: userId,
        name: deck.name,
        description: deck.description
      })
      .select();
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`Deck "${deck.name}" already exists for this user, skipping`);
      } else {
        console.error(`Error creating deck "${deck.name}":`, error.message);
      }
    } else if (data && data.length > 0) {
      console.log(`Deck created: ${deck.name} (${data[0].id})`);
    }
  }
}

// Run the seed function
seedUsers(); 