import 'package:flutter/material.dart';

import 'app.dart';
import 'core/api_client.dart';
import 'core/planner_repository.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    SmartPlannerApp(
      repository: ApiPlannerRepository(ApiClient()),
    ),
  );
}
