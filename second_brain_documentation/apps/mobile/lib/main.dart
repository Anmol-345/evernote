import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:second_brain_mobile/home_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase with development project credentials
  await Supabase.initialize(
    url: 'https://kmbkfbiebstmujnwtgdx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttYmtmYmllYnN0bXVqbnd0Z2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzkwMzMsImV4cCI6MjEwNzMxNTAzM30.ouFKeYbMJTGp4-Hduc7IVQL3UJNfPwY17jRcKCvjoFc',
  );

  runApp(const SecondBrainApp());
}

class SecondBrainApp extends StatelessWidget {
  const SecondBrainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Second Brain',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const HomePage(),
      routes: {
        '/home': (context) => const HomePage(),
      },
    );
  }
}