class ScheduleEvent {
  const ScheduleEvent({
    required this.id,
    required this.title,
    required this.type,
    required this.priority,
    required this.status,
    required this.startAt,
    this.endAt,
    this.location,
  });

  final int id;
  final String title;
  final String type;
  final String priority;
  final String status;
  final DateTime startAt;
  final DateTime? endAt;
  final String? location;

  factory ScheduleEvent.fromJson(Map<String, dynamic> json) {
    return ScheduleEvent(
      id: json['id'] as int,
      title: json['title'] as String? ?? '未命名事件',
      type: json['type'] as String? ?? 'NORMAL',
      priority: json['priority'] as String? ?? 'MEDIUM',
      status: json['status'] as String? ?? 'PLANNED',
      startAt: DateTime.parse(json['startAt'] as String),
      endAt: json['endAt'] == null
          ? null
          : DateTime.parse(json['endAt'] as String),
      location: json['location'] as String?,
    );
  }
}
