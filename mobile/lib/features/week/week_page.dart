import 'package:flutter/material.dart';

import '../../core/planner_repository.dart';
import '../../models/schedule_event.dart';
import '../detail/event_detail_sheet.dart';

class WeekPage extends StatefulWidget {
  const WeekPage({required this.repository, super.key});

  final PlannerRepository repository;

  @override
  State<WeekPage> createState() => _WeekPageState();
}

class _WeekPageState extends State<WeekPage> {
  late DateTime _weekStart;
  late Future<List<ScheduleEvent>> _events;

  @override
  void initState() {
    super.initState();
    _weekStart = _startOfWeek(DateTime.now());
    _events = _load();
  }

  Future<List<ScheduleEvent>> _load() {
    return widget.repository.eventsForRange(
      _weekStart,
      _weekStart.add(const Duration(days: 7)),
    );
  }

  void _reload() {
    setState(() {
      _events = _load();
    });
  }

  void _shiftWeek(int delta) {
    setState(() {
      _weekStart = _weekStart.add(Duration(days: delta * 7));
      _events = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('周视图'),
        centerTitle: false,
        actions: [
          IconButton(
            tooltip: '上一周',
            onPressed: () => _shiftWeek(-1),
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          IconButton(
            tooltip: '下一周',
            onPressed: () => _shiftWeek(1),
            icon: const Icon(Icons.chevron_right_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _reload(),
        child: FutureBuilder<List<ScheduleEvent>>(
          future: _events,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _WeekMessage(
                message: snapshot.error.toString(),
                action: TextButton(
                  onPressed: _reload,
                  child: const Text('重试'),
                ),
              );
            }
            final events = snapshot.data ?? const <ScheduleEvent>[];
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 30),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _rangeLabel(_weekStart),
                        style: const TextStyle(
                          color: Color(0xFF111827),
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _weekStart = _startOfWeek(DateTime.now());
                          _events = _load();
                        });
                      },
                      child: const Text('本周'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                for (var index = 0; index < 7; index++)
                  _DayGroup(
                    day: _weekStart.add(Duration(days: index)),
                    events: events
                        .where(
                          (event) => _isSameDay(
                            event.startAt,
                            _weekStart.add(Duration(days: index)),
                          ),
                        )
                        .toList(),
                    onOpen: _openEvent,
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _openEvent(ScheduleEvent event) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => EventDetailSheet(
        repository: widget.repository,
        event: event,
      ),
    );
    if (changed == true) {
      _reload();
    }
  }

  DateTime _startOfWeek(DateTime value) {
    final day = DateTime(value.year, value.month, value.day);
    return day.subtract(Duration(days: day.weekday - 1));
  }

  String _rangeLabel(DateTime start) {
    final end = start.add(const Duration(days: 6));
    return '${start.month} 月 ${start.day} 日 — ${end.month} 月 ${end.day} 日';
  }

  bool _isSameDay(DateTime left, DateTime right) {
    return left.year == right.year &&
        left.month == right.month &&
        left.day == right.day;
  }
}

class _DayGroup extends StatelessWidget {
  const _DayGroup({
    required this.day,
    required this.events,
    required this.onOpen,
  });

  final DateTime day;
  final List<ScheduleEvent> events;
  final ValueChanged<ScheduleEvent> onOpen;

  @override
  Widget build(BuildContext context) {
    final isToday = _sameDay(day, DateTime.now());
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                _weekdayLabel(day.weekday),
                style: TextStyle(
                  color: isToday
                      ? const Color(0xFF2563EB)
                      : const Color(0xFF111827),
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 7),
              Text(
                '${day.month}/${day.day}',
                style: TextStyle(
                  color: isToday
                      ? const Color(0xFF2563EB)
                      : const Color(0xFF64748B),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (isToday) ...[
                const SizedBox(width: 6),
                const Text(
                  '今天',
                  style: TextStyle(
                    color: Color(0xFF2563EB),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 7),
          if (events.isEmpty)
            const Padding(
              padding: EdgeInsets.only(left: 2, top: 2, bottom: 4),
              child: Text(
                '暂无安排',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
            )
          else
            for (final event in events) ...[
              _WeekEventCard(event: event, onTap: () => onOpen(event)),
              const SizedBox(height: 8),
            ],
        ],
      ),
    );
  }

  String _weekdayLabel(int weekday) {
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return labels[weekday - 1];
  }

  bool _sameDay(DateTime left, DateTime right) {
    return left.year == right.year &&
        left.month == right.month &&
        left.day == right.day;
  }
}

class _WeekEventCard extends StatelessWidget {
  const _WeekEventCard({required this.event, required this.onTap});

  final ScheduleEvent event;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.fromLTRB(11, 10, 11, 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Row(
            children: [
              Container(
                width: 3,
                height: 32,
                decoration: BoxDecoration(
                  color: _typeColor(event.type),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF111827),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _timeRange(event),
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _timeRange(ScheduleEvent event) {
    String time(DateTime value) {
      String two(int number) => number.toString().padLeft(2, '0');
      return '${two(value.hour)}:${two(value.minute)}';
    }

    return '${time(event.startAt)} - ${event.endAt == null ? "进行中" : time(event.endAt!)}';
  }

  Color _typeColor(String type) {
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

class _WeekMessage extends StatelessWidget {
  const _WeekMessage({required this.message, required this.action});

  final String message;
  final Widget action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.calendar_view_week_outlined,
                size: 30, color: Color(0xFF64748B)),
            const SizedBox(height: 10),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
            ),
            const SizedBox(height: 8),
            action,
          ],
        ),
      ),
    );
  }
}
