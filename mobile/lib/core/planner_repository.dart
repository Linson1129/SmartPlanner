import '../models/schedule_event.dart';
import 'api_client.dart';

abstract class PlannerRepository {
  Future<List<ScheduleEvent>> eventsForDay(DateTime day);
}

class ApiPlannerRepository implements PlannerRepository {
  ApiPlannerRepository(this._client);

  final ApiClient _client;

  @override
  Future<List<ScheduleEvent>> eventsForDay(DateTime day) {
    return _client.eventsForDay(day);
  }
}
