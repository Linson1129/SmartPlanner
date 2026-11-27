import 'package:flutter/material.dart';

import '../../core/planner_repository.dart';
import '../../models/schedule_event.dart';

class EventDetailSheet extends StatefulWidget {
  const EventDetailSheet({
    required this.repository,
    required this.event,
    super.key,
  });

  final PlannerRepository repository;
  final ScheduleEvent event;

  @override
  State<EventDetailSheet> createState() => _EventDetailSheetState();
}

class _EventDetailSheetState extends State<EventDetailSheet> {
  bool _working = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 4,
                  height: 42,
                  margin: const EdgeInsets.only(top: 4, right: 10),
                  decoration: BoxDecoration(
                    color: _typeColor(event.type),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Expanded(
                  child: Text(
                    event.title,
                    style: const TextStyle(
                      color: Color(0xFF111827),
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: '关闭',
                  onPressed: _working ? null : () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _DetailRow(icon: Icons.schedule_rounded, text: _timeRange(event)),
            if (event.location != null && event.location!.isNotEmpty)
              _DetailRow(icon: Icons.place_outlined, text: event.location!),
            _DetailRow(
              icon: Icons.sell_outlined,
              text:
                  '${_typeLabel(event.type)} · ${_priorityLabel(event.priority)}',
            ),
            if (event.status == 'DONE') ...[
              const SizedBox(height: 8),
              const Chip(
                avatar: Icon(Icons.check_rounded, size: 16),
                label: Text('已完成'),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(
                _error!,
                style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
              ),
            ],
            const SizedBox(height: 22),
            Row(
              children: [
                if (event.status != 'DONE')
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _working ? null : _complete,
                      icon: const Icon(Icons.check_rounded, size: 18),
                      label: const Text('标记完成'),
                    ),
                  ),
                if (event.status != 'DONE') const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _working ? null : _delete,
                    icon: const Icon(Icons.delete_outline_rounded, size: 18),
                    label: const Text('删除'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFB91C1C),
                      side: const BorderSide(color: Color(0xFFFECACA)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _complete() async {
    setState(() {
      _working = true;
      _error = null;
    });
    try {
      await widget.repository.completeEvent(widget.event.id);
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _working = false;
        _error = error.toString();
      });
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除这个事件？'),
        content: const Text('删除后无法恢复。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _working = true;
      _error = null;
    });
    try {
      await widget.repository.deleteEvent(widget.event.id);
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _working = false;
        _error = error.toString();
      });
    }
  }

  String _timeRange(ScheduleEvent event) {
    String time(DateTime value) {
      String two(int number) => number.toString().padLeft(2, '0');
      return '${two(value.hour)}:${two(value.minute)}';
    }

    final start = time(event.startAt);
    final end = event.endAt == null ? '进行中' : time(event.endAt!);
    return '${event.startAt.month}月${event.startAt.day}日 $start - $end';
  }

  String _typeLabel(String type) {
    switch (type) {
      case 'IMPORTANT':
        return '重要事件';
      case 'CASUAL':
        return '随意事件';
      case 'CONTAINER':
        return '容器';
      case 'GOAL':
        return '目标';
      default:
        return '普通事件';
    }
  }

  String _priorityLabel(String priority) {
    switch (priority) {
      case 'HIGH':
        return '高优先级';
      case 'LOW':
        return '低优先级';
      default:
        return '中优先级';
    }
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

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF64748B)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
