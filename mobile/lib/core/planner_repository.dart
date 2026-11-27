import '../models/create_event_input.dart';
import '../models/schedule_event.dart';
import 'api_client.dart';

abstract class PlannerRepository {
  Future<List<ScheduleEvent>> eventsForDay(DateTime day);

  Future<ScheduleEvent> createEvent(CreateEventInput input);
}

class ApiPlannerRepository implements PlannerRepository {
  ApiPlannerRepository(this._client);

  final ApiClient _client;

  @override
  Future<List<ScheduleEvent>> eventsForDay(DateTime day) {
    return _client.eventsForDay(day);
  }

  @override
  Future<ScheduleEvent> createEvent(CreateEventInput input) {
    return _client.createEvent(input);
  }
}
