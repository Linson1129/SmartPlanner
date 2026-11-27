import 'package:flutter/material.dart';

import '../../core/planner_repository.dart';
import '../../models/create_event_input.dart';
import '../../models/schedule_event.dart';

const _eventTypes = <String, String>{
  'NORMAL': '普通事件',
  'IMPORTANT': '重要事件',
  'CASUAL': '随意事件',
  'CONTAINER': '容器',
  'GOAL': '目标',
};

const _priorities = <String, String>{
  'LOW': '低',
  'MEDIUM': '中',
  'HIGH': '高',
};

class EventFormSheet extends StatefulWidget {
  const EventFormSheet({
    required this.repository,
    this.event,
    super.key,
  });

  final PlannerRepository repository;
  final ScheduleEvent? event;

  @override
  State<EventFormSheet> createState() => _EventFormSheetState();
}

class _EventFormSheetState extends State<EventFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _locationController = TextEditingController();

  String _type = 'NORMAL';
  String _priority = 'MEDIUM';
  late DateTime _startAt;
  late DateTime _endAt;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final existing = widget.event;
    if (existing != null) {
      _titleController.text = existing.title;
      _locationController.text = existing.location ?? '';
      _type = existing.type;
      _priority = existing.priority;
      _startAt = existing.startAt;
      _endAt = existing.endAt ?? existing.startAt.add(const Duration(hours: 1));
      return;
    }
    final now = DateTime.now();
    final next = now.add(const Duration(hours: 1));
    _startAt = DateTime(next.year, next.month, next.day, next.hour);
    if (_startAt.hour >= 23) {
      _startAt = DateTime(next.year, next.month, next.day + 1, 9);
    }
    _endAt = _startAt.add(const Duration(hours: 1));
  }

  @override
  void dispose() {
    _titleController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.event == null ? '新建事件' : '编辑事件',
                        style: const TextStyle(
                          color: Color(0xFF111827),
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: '关闭',
                      onPressed: _saving ? null : () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextFormField(
                  key: const ValueKey('event-title'),
                  controller: _titleController,
                  autofocus: true,
                  textInputAction: TextInputAction.done,
                  maxLength: 200,
                  decoration: const InputDecoration(
                    labelText: '事件名称',
                    hintText: '例如：和团队同步需求',
                    counterText: '',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return '请填写事件名称';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _type,
                  decoration: const InputDecoration(
                    labelText: '事件类型',
                    border: OutlineInputBorder(),
                  ),
                  items: _eventTypes.entries
                      .map(
                        (entry) => DropdownMenuItem(
                          value: entry.key,
                          child: Text(entry.value),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) setState(() => _type = value);
                  },
                ),
                const SizedBox(height: 12),
                InputDecorator(
                  decoration: const InputDecoration(
                    labelText: '优先级',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.fromLTRB(12, 10, 12, 10),
                  ),
                  child: SegmentedButton<String>(
                    showSelectedIcon: false,
                    segments: _priorities.entries
                        .map(
                          (entry) => ButtonSegment(
                            value: entry.key,
                            label: Text(entry.value),
                          ),
                        )
                        .toList(),
                    selected: {_priority},
                    onSelectionChanged: (selection) {
                      setState(() => _priority = selection.first);
                    },
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _DateTimeField(
                        label: '开始',
                        value: _startAt,
                        onTap: _pickStart,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _DateTimeField(
                        label: '结束',
                        value: _endAt,
                        onTap: _pickEnd,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _locationController,
                  maxLength: 200,
                  decoration: const InputDecoration(
                    labelText: '地点（可选）',
                    counterText: '',
                    border: OutlineInputBorder(),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    _error!,
                    style: const TextStyle(
                      color: Color(0xFFB91C1C),
                      fontSize: 12,
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('保存'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _pickStart() async {
    final picked = await _pickDateTime(_startAt);
    if (picked == null) return;
    setState(() {
      _startAt = picked;
      if (!_endAt.isAfter(_startAt)) {
        _endAt = _startAt.add(const Duration(hours: 1));
      }
    });
  }

  Future<void> _pickEnd() async {
    final picked = await _pickDateTime(_endAt);
    if (picked == null) return;
    setState(() => _endAt = picked);
  }

  Future<DateTime?> _pickDateTime(DateTime initial) async {
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (date == null || !mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (!_endAt.isAfter(_startAt)) {
      setState(() => _error = '结束时间需要晚于开始时间');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final input = CreateEventInput(
        title: _titleController.text.trim(),
        type: _type,
        priority: _priority,
        startAt: _startAt,
        endAt: _endAt,
        location: _locationController.text.trim().isEmpty
            ? null
            : _locationController.text.trim(),
      );
      final existing = widget.event;
      final created = existing == null
          ? await widget.repository.createEvent(input)
          : await widget.repository.updateEvent(existing.id, input);
      if (!mounted) return;
      Navigator.pop<ScheduleEvent>(context, created);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = error.toString();
      });
    }
  }
}

class _DateTimeField extends StatelessWidget {
  const _DateTimeField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final DateTime value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    String two(int number) => number.toString().padLeft(2, '0');
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          suffixIcon: const Icon(Icons.schedule_rounded, size: 18),
        ),
        child: Text(
          '${value.month}月${value.day}日 ${two(value.hour)}:${two(value.minute)}',
          style: const TextStyle(fontSize: 12, color: Color(0xFF111827)),
        ),
      ),
    );
  }
}
