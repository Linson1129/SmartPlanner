import 'package:flutter_test/flutter_test.dart';
import 'package:smartplanner_mobile/app.dart';
import 'package:smartplanner_mobile/core/planner_repository.dart';
import 'package:smartplanner_mobile/models/schedule_event.dart';

class FakePlannerRepository implements PlannerRepository {
  @override
  Future<List<ScheduleEvent>> eventsForDay(DateTime day) async {
    return [
      ScheduleEvent(
        id: 1,
        title: '团队同步',
        type: 'IMPORTANT',
        priority: 'HIGH',
        status: 'PLANNED',
        startAt: DateTime(day.year, day.month, day.day, 10),
        endAt: DateTime(day.year, day.month, day.day, 11),
        location: '会议室',
      ),
    ];
  }
}

void main() {
  testWidgets('shows the mobile skeleton and today event', (tester) async {
    await tester.pumpWidget(
      SmartPlannerApp(repository: FakePlannerRepository()),
    );
    await tester.pumpAndSettle();

    expect(find.text('SmartPlanner'), findsOneWidget);
    expect(find.text('今天'), findsWidgets);
    expect(find.text('团队同步'), findsOneWidget);
    expect(find.text('10:00 - 11:00'), findsOneWidget);
  });
}
