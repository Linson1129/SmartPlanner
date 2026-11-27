class DeleteResult {
  const DeleteResult({required this.id, required this.detachedChildren});

  final int id;
  final int detachedChildren;

  factory DeleteResult.fromJson(Map<String, dynamic> json) {
    return DeleteResult(
      id: json['id'] as int,
      detachedChildren: json['detachedChildren'] as int? ?? 0,
    );
  }
}
