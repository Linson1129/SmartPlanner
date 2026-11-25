import 'package:flutter/material.dart';

import 'core/planner_repository.dart';
import 'features/placeholders/placeholder_page.dart';
import 'features/today/today_page.dart';

class SmartPlannerApp extends StatefulWidget {
  const SmartPlannerApp({required this.repository, super.key});

  final PlannerRepository repository;

  @override
  State<SmartPlannerApp> createState() => _SmartPlannerAppState();
}

class _SmartPlannerAppState extends State<SmartPlannerApp> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartPlanner',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF6F7F9),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF111827),
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
        navigationBarTheme: const NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: Color(0xFFEFF6FF),
          labelTextStyle: WidgetStatePropertyAll(
            TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ),
      ),
      home: Scaffold(
        body: IndexedStack(
          index: _index,
          children: [
            TodayPage(repository: widget.repository),
            const PlaceholderPage(
              title: '周视图',
              icon: Icons.calendar_view_week_rounded,
            ),
            const PlaceholderPage(
              title: '设置',
              icon: Icons.tune_rounded,
            ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (next) => setState(() => _index = next),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.today_outlined),
              selectedIcon: Icon(Icons.today_rounded),
              label: '今天',
            ),
            NavigationDestination(
              icon: Icon(Icons.calendar_view_week_outlined),
              selectedIcon: Icon(Icons.calendar_view_week_rounded),
              label: '周视图',
            ),
            NavigationDestination(
              icon: Icon(Icons.tune_outlined),
              selectedIcon: Icon(Icons.tune_rounded),
              label: '设置',
            ),
          ],
        ),
      ),
    );
  }
}
