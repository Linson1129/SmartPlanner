import 'package:flutter/material.dart';

class PlaceholderPage extends StatelessWidget {
  const PlaceholderPage({
    required this.title,
    required this.icon,
    super.key,
  });

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        centerTitle: false,
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 36, color: const Color(0xFF64748B)),
            const SizedBox(height: 12),
            Text(
              '$title 骨架已就绪',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            const Text(
              '后续迭代接入完整功能',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}
