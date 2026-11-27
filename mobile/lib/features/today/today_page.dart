import 'package:flutter/material.dart';

import '../../core/planner_repository.dart';
import '../../models/schedule_event.dart';
import '../create/create_event_sheet.dart';

class TodayPage extends StatefulWidget {
  const TodayPage({required this.repository, super.key});

  final PlannerRepository repository;

  @override
  State<TodayPage> createState() => _TodayPageState();
}

class _TodayPageState extends State<TodayPage> {
  late Future<List<ScheduleEvent>> _events;

  @override
  void initState() {
    super.initState();
    _events = widget.repository.eventsForDay(DateTime.now());
  }

  Future<void> _reload() async {
    final next = widget.repository.eventsForDay(DateTime.now());
    setState(() {
      _events = next;
    });
    await next;
  }

  Future<void> _openCreate() async {
    final created = await showModalBottomSheet<ScheduleEvent>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: false,
      builder: (context) => CreateEventSheet(repository: widget.repository),
    );
    if (created != null) {
      await _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        tooltip: '新建事件',
        icon: const Icon(Icons.add_rounded),
        label: const Text('新建事件'),
      ),
      appBar: AppBar(
        title: const Text('SmartPlanner'),
        centerTitle: false,
        actions: [
          IconButton(
            tooltip: '刷新',
            onPressed: () => _reload(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 96),
          children: [
            Text(
              '${today.month} 月 ${today.day} 日',
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              '今天',
              style: TextStyle(
                color: Color(0xFF111827),
                fontSize: 32,
                fontWeight: FontWeight.w700,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 20),
            FutureBuilder<List<ScheduleEvent>>(
              future: _events,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.only(top: 48),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                if (snapshot.hasError) {
                  return _ErrorState(
                    message: snapshot.error.toString(),
                    onRetry: _reload,
                  );
                }
                final events = snapshot.data ?? const <ScheduleEvent>[];
                if (events.isEmpty) {
                  return const _EmptyState();
                }
                return Column(
                  children: [
                    for (final event in events) ...[
                      _EventCard(event: event),
                      const SizedBox(height: 10),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({required this.event});

  final ScheduleEvent event;

  @override
  Widget build(BuildContext context) {
    final color = _eventColor(event.type);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 4,
            height: 42,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: const TextStyle(
                    color: Color(0xFF111827),
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _timeRange(event),
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 12,
                  ),
                ),
                if (event.location != null && event.location!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    event.location!,
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _timeRange(ScheduleEvent event) {
    final start = _time(event.startAt);
    final end = event.endAt == null ? '进行中' : _time(event.endAt!);
    return '$start - $end';
  }

  String _time(DateTime value) {
    String two(int number) => number.toString().padLeft(2, '0');
    return '${two(value.hour)}:${two(value.minute)}';
  }

  Color _eventColor(String type) {
    switch (type) {
      case 'IMPORTANT':
        return const Color(0xFFDC2626);
      case 'CASUAL':
        return const Color(0xFFD97706);
      case 'CONTAINER':
        return const Color(0xFF2563EB);
      case 'GOAL':
        return const Color(0xFF7C3AED);
      default:
        return const Color(0xFF475569);
    }
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.symmetric(vertical: 44, horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: const Column(
        children: [
          Icon(Icons.event_available_rounded,
              size: 28, color: Color(0xFF64748B)),
          SizedBox(height: 10),
          Text(
            '今天还没有安排',
            style: TextStyle(
              color: Color(0xFF111827),
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          const Icon(Icons.cloud_off_rounded,
              size: 28, color: Color(0xFF64748B)),
          const SizedBox(height: 10),
          const Text(
            '暂时无法读取日程',
            style: TextStyle(
              color: Color(0xFF111827),
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
          ),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: onRetry, child: const Text('重试')),
        ],
      ),
    );
  }
}
