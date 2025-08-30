# Kafka Topic 테스트 프로젝트

Kafka를 사용한 Producer/Consumer 패턴 구현 예제입니다.

## 프로젝트 구조

```
.
├── docker-compose.yml  # Kafka 및 서비스 컨테이너 설정
├── producer/          # Producer 서비스 (포트 3001)
│   └── index.js
└── consumer/          # Consumer 서비스 (포트 3002)
    └── index.js
```

## 실행 방법

```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

## API 테스트

### 1. Producer - 메시지 전송

```bash
# 메시지 전송
curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Kafka!"}'

# 여러 메시지 전송 예제
curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -d '{"message":"첫 번째 메시지"}'

curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -d '{"message":"두 번째 메시지"}'

curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -d '{"message":"테스트 메시지 123"}'
```

### 2. Consumer - 메시지 조회

```bash
# 받은 메시지 목록 조회
curl http://localhost:3002/messages

# 예쁜 출력 (jq 사용)
curl http://localhost:3002/messages | jq .
```

## Kafka 내부 확인 방법

### 1. Kafka 컨테이너 접속

```bash
# Kafka 컨테이너 쉘 접속
docker exec -it kafka /bin/bash
```

### 2. 토픽 관리

```bash
# 토픽 목록 확인
docker exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092

# test-topic 상세 정보 확인
docker exec kafka kafka-topics.sh --describe \
  --topic test-topic \
  --bootstrap-server localhost:9092

# 토픽 생성 (수동)
docker exec kafka kafka-topics.sh --create \
  --topic my-new-topic \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1

# 토픽 삭제
docker exec kafka kafka-topics.sh --delete \
  --topic my-new-topic \
  --bootstrap-server localhost:9092
```

### 3. 메시지 확인

```bash
# test-topic의 모든 메시지 확인 (처음부터)
docker exec kafka kafka-console-consumer.sh \
  --topic test-topic \
  --from-beginning \
  --bootstrap-server localhost:9092

# 실시간으로 새 메시지만 확인
docker exec kafka kafka-console-consumer.sh \
  --topic test-topic \
  --bootstrap-server localhost:9092

# 특정 파티션의 메시지 확인
docker exec kafka kafka-console-consumer.sh \
  --topic test-topic \
  --partition 0 \
  --from-beginning \
  --bootstrap-server localhost:9092
```

### 4. 콘솔에서 직접 메시지 보내기

```bash
# 콘솔 프로듀서 실행 (메시지 입력 후 Enter)
docker exec -it kafka kafka-console-producer.sh \
  --topic test-topic \
  --bootstrap-server localhost:9092

# 키-값 형태로 메시지 보내기
docker exec -it kafka kafka-console-producer.sh \
  --topic test-topic \
  --bootstrap-server localhost:9092 \
  --property "parse.key=true" \
  --property "key.separator=:"
```

### 5. Consumer Group 관리

```bash
# Consumer Group 목록 확인
docker exec kafka kafka-consumer-groups.sh --list \
  --bootstrap-server localhost:9092

# test-group 상태 확인 (LAG 확인)
docker exec kafka kafka-consumer-groups.sh --describe \
  --group test-group \
  --bootstrap-server localhost:9092

# Consumer Group 오프셋 리셋 (처음부터 다시 읽기)
docker exec kafka kafka-consumer-groups.sh \
  --group test-group \
  --reset-offsets \
  --to-earliest \
  --topic test-topic \
  --bootstrap-server localhost:9092 \
  --execute
```

## 모니터링 팁

### 실시간 로그 확인

```bash
# 모든 서비스 로그
docker-compose logs -f

# Producer 로그만
docker-compose logs -f producer

# Consumer 로그만
docker-compose logs -f consumer

# Kafka 로그만
docker-compose logs -f kafka
```

### 서비스 상태 확인

```bash
# 컨테이너 상태
docker-compose ps

# 네트워크 연결 상태
docker exec kafka netstat -tuln | grep 9092
```

## 문제 해결

### 서비스가 시작되지 않을 때

```bash
# 컨테이너 완전 삭제 후 재시작
docker-compose down -v
docker-compose up -d
```

### 메시지가 전달되지 않을 때

```bash
# Kafka 연결 상태 확인
docker exec kafka kafka-broker-api-versions.sh \
  --bootstrap-server localhost:9092

# 토픽 파티션 상태 확인
docker exec kafka kafka-topics.sh --describe \
  --topic test-topic \
  --bootstrap-server localhost:9092
```

## 성능 테스트

### 부하 테스트 (Producer)

```bash
# 100개 메시지 연속 전송
for i in {1..100}; do
  curl -X POST http://localhost:3001/send \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"테스트 메시지 $i\"}" &
done
wait

# Consumer에서 확인
curl http://localhost:3002/messages | jq '.messages | length'
```

### Kafka 내장 성능 테스트

```bash
# Producer 성능 테스트
docker exec kafka kafka-producer-perf-test.sh \
  --topic test-topic \
  --num-records 10000 \
  --record-size 100 \
  --throughput 1000 \
  --producer-props bootstrap.servers=localhost:9092

# Consumer 성능 테스트
docker exec kafka kafka-consumer-perf-test.sh \
  --topic test-topic \
  --bootstrap-server localhost:9092 \
  --messages 10000 \
  --threads 1
```