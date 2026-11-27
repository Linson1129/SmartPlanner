class CreateEventInput {
  const CreateEventInput({
    required this.title,
    required this.type,
    required this.priority,
    required this.startAt,
    required this.endAt,
    this.location,
    this.notes = '',
  });

  final String title;
  final String type;
  final String priority;
  final DateTime startAt;
  final DateTime endAt;
  final String? location;
  final String notes;

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'notes': notes,
      'type': type,
      'priority': priority,
      'startAt': _apiDateTime(startAt),
      'endAt': _apiDateTime(endAt),
      'dueAt': null,
      'parentId': null,
      'location': location,
      'weatherSensitive': false,
      'lookaheadDays': 0,
    };
  }

  String _apiDateTime(DateTime value) {
    String two(int number) => number.toString().padLeft(2, '0');
    return '${value.year}-${two(value.month)}-${two(value.day)}'
        'T${two(value.hour)}:${two(value.minute)}:00';
  }
}
